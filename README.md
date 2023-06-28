# bodypart

## Convert model to tensorflowjs

Had to install an older version of protobuf
```
pip install tensorflowjs[wizard]
pip install protobuf==3.20.*
pip install PyInquirer==1.0.3
```

Convert to tfjs  
`tensorflowjs_converter --quantize_uint8 --input_format=keras grad_cm_5.hdf5 tfjs/uint8`
`tensorflowjs_converter --quantize_float16 --input_format=keras tcga-mguh-multilabel.h5 tfjs/float16-tcga`


## Weird things with converting the model
the `--quantize_**` option had to be the first option for some reason

the converted model did not include the model topology in the generated `model.json` file,
had to manually copy it from `./model.json`

The weight names in the generated `model.json` file did not match those in the
root `model.json` file, almost all of them had a `_1` appended. Had to manually
fix this for the model to work correctly.