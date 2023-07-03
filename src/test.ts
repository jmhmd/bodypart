// import fs from "fs";
import dicomParser from "dicom-parser";
// import cornerstone from "@cornerstonejs/core";
// import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as tf from "@tensorflow/tfjs";
import { convert_dicom_to_8bit } from "./convert-dicom-to-8bit";
import { crop_image_array } from "./crop-image-array";
import { constructResponse, constructSeriesDescription } from "./mapping-functions/qvera";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.configure();

const inputfileEl: HTMLInputElement | null = document.getElementById(
  "inputfile"
) as HTMLInputElement;
const outputDivEl: HTMLDivElement | null = document.getElementById(
  "output"
) as HTMLDivElement;
const modelSelectEl: HTMLSelectElement | null = document.getElementById(
  "model-select"
) as HTMLSelectElement;
const cropCheckBoxEl: HTMLInputElement | null = document.getElementById(
  "crop-image"
) as HTMLInputElement;
const thresholdInputEl: HTMLInputElement | null = document.getElementById(
  "crop-threshold"
) as HTMLInputElement;

// Available models
const modelPaths = {
  "Full 32bit float (9.2MB)": "tfjs-models/full-tcga/model.json",
  "Quantized-16bit-float (4.7MB)": "tfjs-models/float16-tcga/model.json",
  "Quantized-8bit-int (2.5MB)": "tfjs-models/uint8-tcga/model.json",
};

// Populate select
Object.keys(modelPaths).forEach((key, i) => {
  const option = document.createElement("option");
  if (i === 0) option.setAttribute("selected", "true");
  option.setAttribute("value", modelPaths[key]);
  option.innerHTML = key;
  modelSelectEl?.appendChild(option);
});

// Get model path
let modelPath = modelSelectEl.value;
console.log(modelPath);
modelSelectEl.addEventListener(
  "change",
  () => (modelPath = modelSelectEl.value)
);
let model: tf.LayersModel;

async function loadAndWarmModel() {
  // Load the desired model
  const startLoad = Date.now();
  model = await tf.loadLayersModel(modelPath, {
    // strict: false, Was using this option to ignore an error that was being
    // thrown when I was first trying to load the model that complained about
    // mismatched layer/weight names. It turns out the tensorflowjs_converter
    // was adding a _1 to the layer names for some reason and I had to fix those
    // manually for it to work.
  });
  const loadTime = Date.now() - startLoad;

  // Warm up model
  const startWarm = Date.now();
  const warmupResult = model.predict(tf.zeros([1, 256, 256, 1]));
  warmupResult.dataSync();
  warmupResult.dispose();
  const warmTime = Date.now() - startWarm;
  outputDivEl?.insertAdjacentHTML(
    "afterbegin",
    `
  <pre style="clear: left">
    Loaded model ${modelPath}
    Load time: ${loadTime}ms
    Warm time: ${warmTime}ms
  </pre>
  `
  );
}
await loadAndWarmModel();
modelSelectEl.addEventListener("change", loadAndWarmModel);

inputfileEl.addEventListener("change", async (e: Event) => {
  // Grab input file
  const inputfile = inputfileEl && inputfileEl.files?.[0];
  if (!inputfileEl.value || !inputfile) {
    return;
  }

  // Create output container and preview canvas
  const resultDivEl = document.createElement("div");
  resultDivEl.style.clear = "left";
  const canvas = document.createElement("canvas");
  canvas.style.float = "left";
  canvas.height = 256;
  canvas.width = 256;
  resultDivEl.appendChild(canvas);
  const resultPreEl = document.createElement("pre");
  resultDivEl.appendChild(resultPreEl);
  outputDivEl.prepend(resultDivEl);

  let previewCanvasContext = canvas.getContext("2d");

  // Assign a static imageId for cornerstone to use
  const imageId = `dicomfile:${Date.now()}`;

  // Load the image, decompress, return image object with raw pixel data
  const image = await cornerstone.loadImage(imageId, {
    loader: (index: string) => {
      return new Promise((resolve, reject) => {
        // const file = fileCache[`dicomfile:${index}`];
        const file = inputfile;
        const fileReader = new FileReader();

        fileReader.onload = () => {
          const dicomPart10AsArrayBuffer = fileReader.result;

          resolve(dicomPart10AsArrayBuffer);
        };

        fileReader.onerror = reject;

        fileReader.readAsArrayBuffer(file);
      });
    },
  });

  const pixelData = image.getPixelData();

  // This just converts the pixel values to 8bit scaled values. The other
  // options were used in the python version to also apply window/level and clip
  // the margins of the image if empty. We're not doing this here yet, not sure
  // whether/how much that would improve performance.
  const image_8bit_flat_array = convert_dicom_to_8bit(
    Array.from(pixelData)
    // 50,
    // 500,
    // [256, 256]
  );

  let x1 = 0,
    y1 = 0,
    x2 = 1,
    y2 = 1;
  if (cropCheckBoxEl.checked) {
    // Find crop bounding box to clip dead space
    let [left, top, right, bottom] = crop_image_array(
      image_8bit_flat_array,
      image.width,
      image.height,
      Number(thresholdInputEl.value) // threshold
    );

    console.log(left, top, right, bottom);
    // Make sure it maintains square aspect ratio
    if (right - left !== bottom - top) {
      if (right - left < bottom - top) {
        const diff = bottom - top - (right - left);
        bottom -= diff / 2;
        top += diff / 2;
      } else {
        const diff = right - left - (bottom - top);
        right -= diff / 2;
        left += diff / 2;
      }
    }

    x1 = left / image.width;
    y1 = top / image.height;
    x2 = right / image.width;
    y2 = bottom / image.height;
  }

  console.log("cropped:", x1, y1, x2, y2);

  // Convert the flat array of pixel values to a single channel 4D tensor
  const tensor = tf.tensor4d(image_8bit_flat_array as number[], [
    1,
    image.width,
    image.height,
    1,
  ]);
  // Crop and resize. This for some reason uses (y, x) coords instead of (x, y)
  let resizedImageTensor = tf.tidy(() =>
    tf.image.cropAndResize(
      tensor,
      // tf.tensor2d([[y1, x1, y2, x2]], [1, 4]),
      // tf.tensor2d([[0, 0, 1, 1]], [1, 4]),
      tf.tensor2d([[y1, x1, y2, x2]], [1, 4]),
      [0],
      [256, 256],
      "bilinear"
    )
  );

  // // Resize the tensor to the required 256x256
  // let resizedImageTensor = tf.tidy(() =>
  //   tf.image.resizeBilinear(tensor, [256, 256])
  // );

  // The model accepts tensors with shape [null, 256, 256, 1], which as far as I
  // understand, the 'null' means any number of images, with size 256x256, and 1
  // channel (greyscale)
  // resizedImageTensor = tf.tidy(() => tf.expandDims(resizedImageTensor, 0));

  // Draw processed image to canvas. To do this, we take our resized tensor and
  // convert it back to a flat array of pixel values 0-255, then just write them
  // directly to the canvas.
  let data = resizedImageTensor.arraySync().flat(10);
  if (previewCanvasContext) {
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        let value = data[256 * y + x];
        previewCanvasContext.fillStyle =
          "rgb(" + value + "," + value + "," + value + ")";
        previewCanvasContext.fillRect(x, y, 1, 1);
      }
    }
  }

  // This normalizes the pixel value range from [0, 255] to [-1, 1], which is
  // what the model requires.
  resizedImageTensor = tf.tidy(() => resizedImageTensor.div(tf.scalar(127.5)));
  resizedImageTensor = tf.tidy(() => resizedImageTensor.sub(tf.scalar(1)));

  const startInference = Date.now();
  const output = model.predict(resizedImageTensor);
  const inferenceTime = Date.now() - startInference;
  resultPreEl.innerHTML += `
    Inference time: ${inferenceTime}ms
    Used ${tf.getBackend()} backend
  `;

  // @ts-ignore
  const outputArray = output.arraySync();
  const [chest, abd, pelv] = outputArray[0];

  // Get normalized series description from dicom tags
  const seriesDescription = constructSeriesDescription(image.data);

  // Print results
  if (outputDivEl) {
    resultPreEl.innerHTML += `
      Chest: ${chest}
      Abdomen: ${abd}
      Pelvis: ${pelv}

      Normalized series description (dicom tags only):
      ${seriesDescription}
    `;
  }
  console.log(output.toString());

  // Clean up? Not sure if the .dispose() calls are necessary
  output.dispose();
  resizedImageTensor.dispose();
});
