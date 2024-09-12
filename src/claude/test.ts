const task_prompt = `Analyze the provided medical image thumbnail to generate a fixed set of metadata. The metadata will be output in a normalized JSON format.

Your task is to determine the following metadata categories based on the image content:

1. Image Modality
   Options: XR, CT, MRI, US, PET,

2. Body Part - A common name may be provided in parentheses to help disambiguate the body part. Return the capitalized version of the body part name.
   Options: HEAD, CHEST, ABDOMEN, PELVIS, CSPINE (cervical spine), TSPINE (thoracic spine), LSPINE (lumbar spine), NECK, ORBITS, BRAIN, UPPER EXTREMITY, LOWER EXTREMITY, KNEE, ANKLE, ELBOW, WRIST

3. Contrast - whether the image is enhanced by a contrast agent or not.
   Options: With Contrast, Without Contrast, Not Applicable

4. Imaging Plane
   Options: Axial, Sagittal, Coronal, Oblique, AP, PA, Lateral, Not Applicable

5. Reconstruction kernel - only applicable to CT images.
   Options: Soft Tissue, Bone, Lung, Not Applicable

6. MR sequence type - only applicable to MR images.
   Options: T1, T2, T2-FLAIR, DWI, ADC, SWI, Not Applicable

7. MR fat suppression - only applicable to MR images.
   Options: Yes, No, Not Applicable

8. Motion artifact - try to determine if there is clinically significant motion artifact in the image.
   Options: Yes, No, Unknown

Carefully analyze the image and determine the most appropriate option for each metadata category. If the information for a category cannot be confidently determined from the image, use "Unknown" for that category.

Output your results in the following JSON format:

<output>
{
  "image_modality": "",
  "body_part": "",
  "contrast": "",
  "imaging_plane": "",
  "reconstruction_kernel": "",
  "mr_sequence_type": "",
  "mr_fat_suppression": "",
  "motion_artifact": ""
}
</output>`;