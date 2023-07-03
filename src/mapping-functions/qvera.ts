import { DataSet } from "dicom-parser";

function equalsIgnoreCase(string1: string, string2: string) {
  return string1.toLowerCase() == string2.toLowerCase();
}

function containsIgnoreCase(parent: string, value: string) {
  return parent.toLowerCase().includes(value.toLowerCase());
}

function isNotBlank(value?: string) {
  return value && value !== null && value !== "" && value !== undefined;
}

function endsWithIgnoreCase(parent: string, value: string) {
  return parent.toLowerCase().endsWith(value.toLowerCase());
}

export function seriesType(dataSet: DataSet) {
  let seriesType = "";

  // todo: calculate...

  return seriesType;
}

export function laterality(dataSet: DataSet) {
  let laterality = "";

  const lateralityTagValue = dataSet.string("x00200060");
  if (!lateralityTagValue) return laterality;
  if (equalsIgnoreCase(lateralityTagValue, "R")) {
    laterality = "R";
  } else if (equalsIgnoreCase(lateralityTagValue, "L")) {
    laterality = "L";
  }

  return laterality;
}

export function bodyPart(dataSet: DataSet) {
  let bodyPart = "";

  const bodyPartTagValue = dataSet.string("x00180015");
  if (!bodyPartTagValue) return bodyPart;

  if (isNotBlank(bodyPartTagValue)) {
    bodyPart = bodyPartTagValue;
    if (containsIgnoreCase(bodyPartTagValue, "Abdomen")) {
      bodyPart = "Abd";
    } else if (containsIgnoreCase(bodyPartTagValue, "Pelvis")) {
      bodyPart = "AbdPel";
    } else if (
      containsIgnoreCase(bodyPartTagValue, "Chest") &&
      containsIgnoreCase(bodyPartTagValue, "Abd")
    ) {
      bodyPart = "CAP";
    } else if (containsIgnoreCase(bodyPartTagValue, "Chest")) {
      bodyPart = "Ch";
    } else if (containsIgnoreCase(bodyPartTagValue, "Cervical")) {
      bodyPart = "CSp";
    } else if (containsIgnoreCase(bodyPartTagValue, "Femur")) {
      bodyPart = "Fem";
    } else if (
      containsIgnoreCase(bodyPartTagValue, "Low") &&
      containsIgnoreCase(bodyPartTagValue, "Ext")
    ) {
      bodyPart = "LExt";
    } else if (containsIgnoreCase(bodyPartTagValue, "Lumbar")) {
      bodyPart = "LSp";
    } else if (containsIgnoreCase(bodyPartTagValue, "Nasopharynx")) {
      bodyPart = "NP";
    } else if (containsIgnoreCase(bodyPartTagValue, "Oropharynx")) {
      bodyPart = "OP";
    } else if (containsIgnoreCase(bodyPartTagValue, "Pituitary")) {
      bodyPart = "Pit";
    } else if (containsIgnoreCase(bodyPartTagValue, "Prostate")) {
      bodyPart = "Pros";
    } else if (containsIgnoreCase(bodyPartTagValue, "Sacroiliac Joint")) {
      bodyPart = "SIJ";
    } else if (
      containsIgnoreCase(bodyPartTagValue, "Temporal Mandibular Joint")
    ) {
      bodyPart = "TMJ";
    } else if (containsIgnoreCase(bodyPartTagValue, "Thoracic")) {
      bodyPart = "TSp";
    } else if (
      containsIgnoreCase(bodyPartTagValue, "Upper") &&
      containsIgnoreCase(bodyPartTagValue, "Ext")
    ) {
      bodyPart = "UExt";
    } else if (
      (containsIgnoreCase(bodyPartTagValue, "Whole") ||
        containsIgnoreCase(bodyPartTagValue, "Entire")) &&
      containsIgnoreCase(bodyPartTagValue, "Body")
    ) {
      bodyPart = "WB";
    }
  }

  return bodyPart;
}

export function anatomicPlane(dataSet: DataSet) {
  let anatomicPlane = "";

  try {
    let orientationVector = dataSet.string("x00200037");
    if (!orientationVector || !isNotBlank(orientationVector)) {
      return anatomicPlane;
    }

    const orientationStringValues = orientationVector.split("\\");
    const [rowX, rowY, rowZ, colX, colY, colZ] = orientationStringValues.map(
      (v) => Number(v)
    );

    let normalX = rowY * colZ - rowZ * colY;
    let normalY = rowZ * colX - rowX * colZ;
    let normalZ = rowX * colY - rowY * colX;

    let normal = [Math.abs(normalX), Math.abs(normalY), Math.abs(normalZ)];
    let maxComponent = Math.max(normalX, normalY, normalZ);

    console.log("maxComponent = " + maxComponent);
    console.log(
      "normal[1,2,3] = [" + normal[0] + "," + normal[1] + "," + normal[2] + "]"
    );

    if (normal[0] === maxComponent) {
      anatomicPlane = "Sag";
    } else if (normal[1] === maxComponent) {
      anatomicPlane = "Cor";
    } else if (normal[2] === maxComponent) {
      anatomicPlane = "Ax";
    } else {
      anatomicPlane = "??";
    }

    if (maxComponent < 0.9) {
      anatomicPlane = anatomicPlane.trim() + "_Obl";
    }
  } catch (err) {
    console.log("Unable to calculate anatomicPlane: " + err);
  }

  return anatomicPlane;
}

export function ivContrast(dataSet: DataSet) {
  let ivContrast = "";

  // todo: calculate...

  return ivContrast;
}

export function luminalContrast(dataSet: DataSet) {
  let luminalContrast = "";

  // todo: calculate...

  return luminalContrast;
}

export function scoutOrDose(dataSet: DataSet) {
  let scoutOrDose = "";

  // todo: calculate...

  return scoutOrDose;
}

export function dualEnergy(dataSet: DataSet) {
  let dualEnergy = "";

  // todo: calculate...

  return dualEnergy;
}

export function sliceThickness(dataSet: DataSet) {
  let sliceThickness = "";

  let sliceThicknessTagValue = Number(dataSet.string("x00180050"));
  if (!sliceThicknessTagValue || Number.isNaN(sliceThicknessTagValue))
    return sliceThickness;

  if (sliceThicknessTagValue < 1) {
    sliceThickness = "Thinner";
  } else if (sliceThicknessTagValue < 2.5) {
    sliceThickness = "Thin";
  } else if (sliceThicknessTagValue <= 5) {
    sliceThickness = "Std";
  } else if (sliceThicknessTagValue > 5) {
    sliceThickness = "Thick";
  }

  return sliceThickness;
}

export function kernel(dataSet: DataSet) {
  let kernel = "";

  let kernelTagValue = dataSet.string("x00181210");
  if (!kernelTagValue) return kernel;

  if (containsIgnoreCase(kernelTagValue, "Lung")) {
    kernel = "Lung";
  } else if (containsIgnoreCase(kernelTagValue, "Bone")) {
    kernel = "Bone";
  } else if (
    containsIgnoreCase(kernelTagValue, "Soft") ||
    containsIgnoreCase(kernelTagValue, "ST")
  ) {
    kernel = "Soft";
  }

  return kernel;
}

export function reconstruction(dataSet: DataSet) {
  let reconstruction = "";

  // todo: calculate...

  return reconstruction;
}

export function gating(dataSet: DataSet) {
  let gating = "";

  // todo: calculate...

  return gating;
}

export function positioning(dataSet: DataSet) {
  let positioning = "";

  let positioningTagValue = dataSet.string("0018,5100");
  if (!positioningTagValue) return positioning;

  if (endsWithIgnoreCase(positioningTagValue, "S")) {
    positioning = ""; // Supine is default
  } else if (endsWithIgnoreCase(positioningTagValue, "P")) {
    positioning = "Prone";
  } else if (endsWithIgnoreCase(positioningTagValue, "DR")) {
    positioning = "RLD";
  } else if (endsWithIgnoreCase(positioningTagValue, "DL")) {
    positioning = "LLD";
  }

  return positioning;
}

export function sectionSpecificFeatures(dataSet: DataSet) {
  let sectionSpecificFeatures = "";

  // todo: calculate...

  return sectionSpecificFeatures;
}

export function secondaryCapture(dataSet: DataSet) {
  let secondaryCapture = "";

  let imageTypeTagValue = dataSet.string("0008,0008");
  if (!imageTypeTagValue) return secondaryCapture;
  let stringValues = imageTypeTagValue.split("\\");

  if (equalsIgnoreCase(stringValues[1], "Secondary")) {
    secondaryCapture = "SC";
  } else if (equalsIgnoreCase(stringValues[1], "PostProc")) {
    secondaryCapture = "PostProc";
  }

  return secondaryCapture;
}

export function secondaryCaptureNumber(dataSet: DataSet) {
  var secondaryCaptureNumber = "";

  // todo: calculate...

  return secondaryCaptureNumber;
}

export function getAllValues(dataSet: DataSet) {
  return {
    seriesType: seriesType(dataSet),
    laterality: laterality(dataSet),
    bodyPart: bodyPart(dataSet),
    anatomicPlane: anatomicPlane(dataSet),
    ivContrast: ivContrast(dataSet),
    luminalContrast: luminalContrast(dataSet),
    scoutOrDose: scoutOrDose(dataSet),
    dualEnergy: dualEnergy(dataSet),
    sliceThickness: sliceThickness(dataSet),
    kernel: kernel(dataSet),
    reconstruction: reconstruction(dataSet),
    gating: gating(dataSet),
    positioning: positioning(dataSet),
    sectionSpecificFeatures: sectionSpecificFeatures(dataSet),
    secondaryCapture: secondaryCapture(dataSet),
    secondaryCaptureNumber: secondaryCaptureNumber(dataSet),
  };
}

export function constructSeriesDescription(dataSet: DataSet) {
  const allValues = getAllValues(dataSet);

  let seriesDescription = [
    allValues["seriesType"],
    allValues["laterality"],
    allValues["bodyPart"],
    allValues["anatomicPlane"],
    allValues["ivContrast"],
    allValues["luminalContrast"],
    allValues["scoutOrDose"],
    allValues["dualEnergy"],
    allValues["sliceThickness"],
    allValues["kernel"],
    allValues["reconstruction"],
    allValues["gating"],
    allValues["positioning"],
    allValues["sectionSpecificFeatures"],
    allValues["secondaryCapture"],
    allValues["secondaryCaptureNumber"],
  ]
    .filter(isNotBlank)
    .join(" ")
    .trim();

  return seriesDescription;
}

export function constructResponse(dataSet: DataSet) {
  const seriesDescription = constructSeriesDescription(dataSet);
  let value = {
    "00080005": {
      Value: [dataSet.string("x00080005")],
      vr: "CS",
    },
    "0008103E": {
      Value: [seriesDescription],
      vr: "LO",
    },
    "00081190": {
      Value: ["/*{mc:dicomWebServiceUrl}*/studies//*{mc:studyUID}*/"],
      vr: "UR",
    },
    "00081198": {
      vr: "SQ",
    },
    "00081199": {
      Value: [
        {
          "00081150": {
            Value: ["/*{mc:refSopClassUID}*/"],
            vr: "UI",
          },
          "00081155": {
            Value: ["/*{mc:instanceUID}*/"],
            vr: "UI",
          },
          "00081190": {
            Value: [
              "/*{mc:dicomWebServiceUrl}*/studies//*{mc:studyUID}*//series//*{mc:seriesUID}*//instances//*{mc:instanceUID}*/",
            ],
            vr: "UR",
          },
        },
      ],
      vr: "SQ",
    },
  };
  //   var value = qie.evaluateTemplate(
  //     "{\n" +
  //       '   "00080005": {\n' +
  //       '      "Value": [\n' +
  //       '         "/*{mc:charset}*/"\n' +
  //       "      ]
  //       '      "vr": "CS"\n' +
  //       "   },\n" +
  //       '   "0008103E": {\n' +
  //       '      "Value": [\n' +
  //       '         "/*{mc:seriesDescription}*/"\n' +
  //       "      ],\n" +
  //       '      "vr": "LO"\n' +
  //       "   },\n" +
  //       '   "00081190": {\n' +
  //       '      "Value": [\n' +
  //       '         "/*{mc:dicomWebServiceUrl}*/studies//*{mc:studyUID}*/"\n' +
  //       "      ],\n" +
  //       '      "vr": "UR"\n' +
  //       "   },\n" +
  //       '   "00081198": {\n' +
  //       '      "vr": "SQ"\n' +
  //       "   },\n" +
  //       '   "00081199": {\n' +
  //       '      "Value": [\n' +
  //       "         {\n" +
  //       '            "00081150": {\n' +
  //       '               "Value": [\n' +
  //       '                  "/*{mc:refSopClassUID}*/"\n' +
  //       "               ],\n" +
  //       '               "vr": "UI"\n' +
  //       "            },\n" +
  //       '            "00081155": {\n' +
  //       '               "Value": [\n' +
  //       '                  "/*{mc:instanceUID}*/"\n' +
  //       "               ],\n" +
  //       '               "vr": "UI"\n' +
  //       "            },\n" +
  //       '            "00081190": {\n' +
  //       '               "Value": [\n' +
  //       '                  "/*{mc:dicomWebServiceUrl}*/studies//*{mc:studyUID}*//series//*{mc:seriesUID}*//instances//*{mc:instanceUID}*/"\n' +
  //       "               ],\n" +
  //       '               "vr": "UR"\n' +
  //       "            }\n" +
  //       "         }\n" +
  //       "      ],\n" +
  //       '      "vr": "SQ"\n' +
  //       "   }\n" +
  //       "}",
  //     "json",
  //     true
  //   );
  //   response.setNode("/", value);
  //   qie.warn("response set: " + response.getNode("/"));

  //   var contentType = "application/dicom+json";
  //   var contentTypeLine = "Content-Type: " + contentType + "\r\n";
  //   qie.warn("sending response: " + response.getNode("/"));
  //   qie.postMessageResponse(contentTypeLine + response.getNode("/"));
  return JSON.stringify(value);
}
