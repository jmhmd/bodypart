// Ported from: https://stackoverflow.com/a/36938923

export function crop_image_array(
  imageArray: number[],
  width: number,
  height: number,
  threshold: number = 0
) {
  let left = 0;
  let top = 0;
  let right = width - 1;
  let bottom = height - 1;
  let minRight = width - 1;
  let minBottom = height - 1;

  function getValue(row, col) {
    return imageArray[col + row * width];
  }

  top: for (; top <= bottom; top++) {
    for (let x = 0; x < width; x++) {
      // if (raster.getSample(x, top, 0) != 0){
      if (getValue(top, x) > threshold) {
        minRight = x;
        minBottom = top;
        break top;
      }
    }
  }

  left: for (; left < minRight; left++) {
    for (let y = height - 1; y > top; y--) {
      if (getValue(y, left) > threshold) {
        // if (raster.getSample(left, y, 0) != 0){
        minBottom = y;
        break left;
      }
    }
  }

  bottom: for (; bottom > minBottom; bottom--) {
    for (let x = width - 1; x >= left; x--) {
      if (getValue(bottom, x) > threshold) {
        // if (raster.getSample(x, bottom, 0) != 0){
        minRight = x;
        break bottom;
      }
    }
  }

  right: for (; right > minRight; right--) {
    for (let y = bottom; y >= top; y--) {
      if (getValue(y, right) > threshold) {
        // if (raster.getSample(right, y, 0) != 0){
        break right;
      }
    }
  }

  return [left, top, right, bottom];
}
