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

let fileCache: { [key: string]: File } = {};

function fileLoader(index: string) {
  return new Promise((resolve, reject) => {
    const file = fileCache[`dicomfile:${index}`];
    const fileReader = new FileReader();

    fileReader.onload = () => {
      const dicomPart10AsArrayBuffer = fileReader.result;

      resolve(dicomPart10AsArrayBuffer);
    };

    fileReader.onerror = reject;

    fileReader.readAsArrayBuffer(file);
  });
}

const inputfileEl: HTMLInputElement | null = document.getElementById(
  "inputfile"
) as HTMLInputElement;
const outputDivEl: HTMLDivElement | null = document.getElementById(
  "output"
) as HTMLDivElement;

document.addEventListener("change", async (e: Event) => {
  const inputfile = inputfileEl && inputfileEl.files?.[0];
  if (!inputfile) {
    throw new Error("No input file found.");
  }
  console.log(inputfile);

  const imageId = `dicomfile:1`;

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

  const image_8bit_flat_array = convert_dicom_to_8bit(
    Array.from(pixelData),
    50,
    500,
    [256, 256]
  );

  const tensor = tf.tensor3d(image_8bit_flat_array as number[], [
    image.width,
    image.height,
    1,
  ]);

  // const rgbaTens3d = tf.tensor3d(uint8array, [canvas.height, canvas.width, 4]);
  // const rgbTens3d = tf.slice3d(rgbaTens3d, [0, 0, 0], [-1, -1, 3]); // strip alpha channel
  let resizedImageTensor = tf.image.resizeBilinear(tensor, [256, 256]);

  resizedImageTensor = tf.expandDims(resizedImageTensor, 0);

  // Draw processed image to canvas
  let canvas = document.createElement("canvas");
  canvas.height = 256;
  canvas.width = 256;
  document.body.appendChild(canvas);

  let data = resizedImageTensor.arraySync().flat(10);

  let ctx = canvas.getContext("2d");
  if (ctx) {
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        let value = data[256 * y + x];
        ctx.fillStyle = "rgb(" + value + "," + value + "," + value + ")";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const model = await tf.loadLayersModel("tfjs/full-tcga/model.json", {
    // strict: false,
  });

  resizedImageTensor = resizedImageTensor.div(tf.scalar(127.5));
  resizedImageTensor = resizedImageTensor.sub(tf.scalar(1));

  const output = model.predict(resizedImageTensor);
  console.log(output);
  // @ts-ignore
  const outputArray = output.arraySync();
  const [chest, abd, pelv] = outputArray[0];

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
