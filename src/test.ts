// import fs from "fs";
import dicomParser from "dicom-parser";
// import cornerstone from "@cornerstonejs/core";
// import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as tf from "@tensorflow/tfjs";
import { convert_dicom_to_8bit } from "./convert-dicom-to-8bit";

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
const logEl: HTMLDivElement | null = document.querySelector(
  "#log pre"
) as HTMLDivElement;

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

const canvas = document.createElement("canvas");
canvas.height = 256;
canvas.width = 256;
document.body.appendChild(canvas);
let previewCanvasContext = canvas.getContext("2d");

document.addEventListener("change", async (e: Event) => {
  // Clear preview canvas
  if (!previewCanvasContext) {
    throw new Error("Unable to get canvas context");
  }
  previewCanvasContext.clearRect(0, 0, canvas.width, canvas.height);

  // Grab input file
  const inputfile = inputfileEl && inputfileEl.files?.[0];
  if (!inputfile) {
    throw new Error("No input file found.");
  }

  // Assign a static imageId for cornerstone to use
  const imageId = `dicomfile:1`;

  // Load the image, decompress, return image object with raw pixel data
  const image = await cornerstone.loadAndCacheImage(imageId, {
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

  // Convert the flat array of pixel values to a single channel 3D tensor
  const tensor = tf.tensor3d(image_8bit_flat_array as number[], [
    image.width,
    image.height,
    1,
  ]);

  // Resize the tensor to the required 256x256
  let resizedImageTensor = tf.image.resizeBilinear(tensor, [256, 256]);

  // The model accepts tensors with shape [null, 256, 256, 1], which as far as I
  // understand, the 'null' means any number of images, with size 256x256, and 1
  // channel (greyscale)
  resizedImageTensor = tf.expandDims(resizedImageTensor, 0);

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

  // Load the desired model
  const model = await tf.loadLayersModel(modelPath, {
    // strict: false, Was using this option to ignore an error that was being
    // thrown when I was first trying to load the model that complained about
    // mismatched layer/weight names. It turns out the tensorflowjs_converter
    // was adding a _1 to the layer names for some reason and I had to fix those
    // manually for it to work.
  });

  // This normalizes the pixel value range from [0, 255] to [-1, 1], which is
  // what the model requires.
  resizedImageTensor = resizedImageTensor.div(tf.scalar(127.5));
  resizedImageTensor = resizedImageTensor.sub(tf.scalar(1));

  const startInference = Date.now();
  const output = model.predict(resizedImageTensor);
  const inferenceTime = Date.now() - startInference;
  logEl.innerHTML += `
    Inference time: ${inferenceTime}ms
    Used ${tf.getBackend()} backend
  `;

  console.log(output);
  // @ts-ignore
  const outputArray = output.arraySync();
  const [chest, abd, pelv] = outputArray[0];

  // Print results
  if (outputDivEl) {
    outputDivEl.innerHTML = `
    <pre>
      Chest: ${chest}
      Abdomen: ${abd}
      Pelvis: ${pelv}
    </pre>
    `;
  }
  console.log(output.toString());
});
