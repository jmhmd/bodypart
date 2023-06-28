import { Tensor } from "@tensorflow/tfjs";

// https://gist.github.com/fpillet/993002
function scaleValue(value: number, from: number[], to: number[]) {
  const scale = (to[1] - to[0]) / (from[1] - from[0]);
  const capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
  return ~~(capped * scale + to[0]);
}
function clampArray(array: number[], min: number, max: number) {
  return array.map((v) => Math.max(Math.min(v, max), min));
}

export function convert_dicom_to_8bit(
  byteArray: number[],
  width: number,
  level: number,
  imsize = [224, 224],
  clip = true
) {
  // Given a DICOM file, window specifications, and image size,
  // return the image as a Numpy array scaled to [0,255] of the specified size.

  // Window level
  // byteArray = clampArray(byteArray, level - width / 2, level + width / 2);

  // let array = tensor.clone();
  // array = array + int(dicom_file.RescaleIntercept) #we did this on preprocess
  // array = array * int(dicom_file.RescaleSlope) #we did this on preprocess
  // array = array.clipByValue(level - width / 2, level + width / 2)
  //   byteArray = clampArray(byteArray, level - width / 2, level + width / 2);
  let arrayMax = byteArray.reduce((a, b) => Math.max(a, b), 0);
  let arrayMin = byteArray.reduce((a, b) => Math.min(a, b), 0);
  // Rescale to [0, 255]
  byteArray = byteArray.map((v) =>
    scaleValue(v, [arrayMin, arrayMax], [0, 255])
  );
  // const arrayMin = array.min();
  // array = scaleValue(array)
  // array -= array.min(0)
  // array /= np.max(array)
  // array *= 255.

  // array = array.astype('uint8')

  // if (clip) {
  //     // Sometimes there is dead space around the images -- let's get rid of that
  //         nonzeros = np.nonzero(array)
  //         x1 = np.min(nonzeros[0]) ; x2 = np.max(nonzeros[0])
  //         y1 = np.min(nonzeros[1]) ; y2 = np.max(nonzeros[1])
  //         array = array[x1:x2,y1:y2]
  // }

  // # Resize image if necessary
  // resize_x = float(imsize[0]) / array.shape[0]
  // resize_y = float(imsize[1]) / array.shape[1]
  // if resize_x != 1. or resize_y != 1.:
  //     array = zoom(array, [resize_x, resize_y], order=1, prefilter=False)
  // return np.expand_dims(array, axis=-1)

  return byteArray;
}
