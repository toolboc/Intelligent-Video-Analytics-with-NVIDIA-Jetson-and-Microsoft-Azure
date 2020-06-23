## Module 3 : Develop and deploy Custom Object Detection Models with IoT Edge DeepStream SDK Module

At this point, you should have deployed a custom DeepStream Configuration that is able to consume input from your desired sources.  We will now look into ways to customize the object detection model that is employed in that configuration to enable to you to create a fully customized Intelligent Video Analytics Pipeline.

This section will assume that you might be brand new to the world of Computer Vision / Artificial Intelligence and that you are interested in the end goal of using a Custom Object Detection model that detects objects that you train it to detect.  If you are interested in obtaining accurate detection of common objects immediately, without the need to train up a custom model, we will also demonstrate how to employ an academic-grade pre-trained object detection model [(YoloV3)](https://pjreddie.com/darknet/yolo/) which has been trained on [80 common objects](../services/YOLOV3/labels.txt).

If you wish to follow along with the steps in this module, we have recorded a livestream presentation titled "[Develop and deploy Custom Object Detection Models with IoT Edge DeepSteam SDK Module](https://www.youtube.com/watch?v=kv0eTobemug)" that walks through the steps below in great detail.

[![Develop and deploy Custom Object Detection Models with IoT Edge DeepSteam SDK Module](../assets/LiveStream3.PNG)](https://www.youtube.com/watch?v=kv0eTobemug)


### Module 3.1 : Training a custom object detection model using Custom Vision AI

*Note: These steps assume that the NVIDIADeepStreamSDK module is configured to reference the `DSConfig-CustomVisionAI.txt` DeepStream configuration*

Microsoft provides a [Custom Vision](https://www.customvision.ai/?WT.mc_id=julyot-iva-pdecarlo) service as part of [Cognitive Services](https://azure.microsoft.com/en-us/services/cognitive-services/?WT.mc_id=julyot-iva-pdecarlo) which allows you to very easily train and export custom object detection models.  To get started, create an account at [customvision.ai](http://customvision.ai/?WT.mc_id=julyot-iva-pdecarlo) then begin a new project with the following options:

![New Custom Vision AI Project](../assets/CreateNewCustomVisionAI.PNG)

Once created, upload at least 15 images per tag (object) that you are interested in detecting. Here is an example using 15 images of myself to train a "person" detector:

![Upload Samples](../assets/UploadSamplesCustomVisionAI.PNG)

Ensure that each image in the training set is tagged appropriately with an associated bounding box around the intended object:

![Tag Samples](../assets/TagSamplesCustomVisionAI.PNG)

With your images tagged, select "Train" and then "Quick Training":

![Train Samples](../assets/TrainSamplesCustomVisionAI.PNG)

Next, select "Performance", and then "Export":

![Export Model](../assets/ExportCustomVisionAI.PNG)

Select ONNX and then right-click the "Download" button to copy the link to download your resulting model:

![Download Model](../assets/DownloadCustomVisionAI.PNG)

Take note of this value as we will use it in the next section. The copied text should look similar to the following:

```
https://irisscuprodstore.blob.core.windows.net/m-ad5281beaf20440a8f3f046e0e7741af/e3ebcf6e22934c7e89ae39ffe2049a46.ONNX.zip?sv=2017-04-17&sr=b&sig=A%2F9raRar12TSTCvH7D72OxD6mBqvRY5doovtwV4Bjt0%3D&se=2020-04-15T20%3A43%3A26Z&sp=r
```

### Module 3.2 : Using a Custom Vision AI Object Detection Model with NVIDIA DeepStream

If we wish to use our new model with our existing application, all we have to do is update the model present in `/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI`.

This can be done on your Jetson device using the commands below, just replace the link in the `wget` command to point to your exported Custom Vision AI model from the previous step.

```
#Delete the contents of the CUSTOM_VISION_AI directory to remove existing model and TensorRT engine
rm -rf /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI/*

#Navigate to CUSTOM_VISION_AI directory
cd /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI

#Download the exported model from CustomVision.AI
#Note: It is important that the link to your model is quoted when running this command!
sudo wget -O model.zip "https://irisscuprodstore.blob.core.windows.net/m-ad5281beaf20440a8f3f046e0e7741af/e3ebcf6e22934c7e89ae39ffe2049a46.ONNX.zip?sv=2017-04-17&sr=b&sig=A%2F9raRar12TSTCvH7D72OxD6mBqvRY5doovtwV4Bjt0%3D&se=2020-04-15T20%3A43%3A26Z&sp=r"

#Unzip the model.zip that we just downloaded
unzip model.zip
```

It is important that you follow this process every time that you update the model (including removing the contents of the `CUSTOM_VISON_AI` directory) as DeepStream will generate a TensorRT engine file on next run if one does not exist.  If this file already exists, you may unintentionally end up referencing an engine that was generated by an older model when what you really want to do is regenerate a new engine for the new model!

The directory contents of `/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI` should now contain the following:

```
CSharp  
cvexport.manifest  
labels.txt  
LICENSE  
model.onnx  
model.zip  
python
```

Technically, our DeepStream configuration only needs access to the labels.txt and model.onnx files. The labels.txt file contains the object detection classes that are supported by your model.  This will consist of the tags used to train your model in CustomVision.AI.  The model.onnx file is an [ONNX](http://onnx.ai/) based [YoloV2Tiny](https://pjreddie.com/darknet/yolov2/) type object detector model.  

After the model has been downloaded and extracted, restart the DeepStreamSDK module so that it can begin using your new model with:
```
docker rm -f NVIDIADeepStreamSDK
```

Wait a few moments for the NVIDIADeepStreamSDK module to restart, then run the following to view the logs of the NVIDIADeepStreamSDK module:
```
docker logs -f NVIDIADeepStreamSDK
```

You should receive output similar to the following:

```
2020-06-10 19:39:48.485400: I tensorflow/stream_executor/platform/default/dso_loader.cc:48] Successfully opened dynamic library libcudart.so.10.2

 *** DeepStream: Launched RTSP Streaming at rtsp://localhost:8555/ds-test ***


(deepstream-test5-app:1): GLib-CRITICAL **: 19:39:49.193: g_strrstr: assertion 'haystack != NULL' failed
nvds_msgapi_connect : connect success
Opening in BLOCKING MODE

Using winsys: x11
ERROR: Deserialize engine failed because file path: /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs/../../CUSTOM_VISION_AI/model.onnx_b1_gpu0_fp32.engine open error
0:00:03.779721457     1     0x21e4b4d0 WARN                 nvinfer gstnvinfer.cpp:599:gst_nvinfer_logger:<primary_gie> NvDsInferContext[UID 1]: Warning from NvDsInferContextImpl::deserializeEngineAndBackend() <nvdsinfer_context_impl.cpp:1566> [UID = 1]: deserialize engine from file :/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs/../../CUSTOM_VISION_AI/model.onnx_b1_gpu0_fp32.engine failed
0:00:03.779815000     1     0x21e4b4d0 WARN                 nvinfer gstnvinfer.cpp:599:gst_nvinfer_logger:<primary_gie> NvDsInferContext[UID 1]: Warning from NvDsInferContextImpl::generateBackendContext() <nvdsinfer_context_impl.cpp:1673> [UID = 1]: deserialize backend context from engine from file :/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs/../../CUSTOM_VISION_AI/model.onnx_b1_gpu0_fp32.engine failed, try rebuild
0:00:03.779842136     1     0x21e4b4d0 INFO                 nvinfer gstnvinfer.cpp:602:gst_nvinfer_logger:<primary_gie> NvDsInferContext[UID 1]: Info from NvDsInferContextImpl::buildModel() <nvdsinfer_context_impl.cpp:1591> [UID = 1]: Trying to create engine from model files
----------------------------------------------------------------
Input filename:   /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI/model.onnx
ONNX IR version:  0.0.3
Opset version:    7
Producer name:
Producer version:
Domain:           onnxml
Model version:    0
Doc string:
----------------------------------------------------------------
```

The error messages indicate that a TensorRT engine does not yet exist for the referenced `model.onnx`.  As mentioned earlier, DeepStream will attempt to regenerate the engine if one is not present.  The first execution will take some extra time to start as the TensorRT engine is generated, but will use the newly generated engine on subsequent executions.

After the TensorRT engine is regenerated, the directory contents of `/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI` should now contain the following (Note: `model.onnx_b1_gpu0_fp32.engine` is now present):

```
CSharp
cvexport.manifest  
labels.txt  
LICENSE  
model.onnx  
model.onnx_b1_gpu0_fp32.engine
model.zip  
python
```

### Module 3.3 : Using the Deployed CameraTaggingModule to gather Training Samples

The [Intelligent Video Analytics deployment ships with a Camera Tagging Module](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/deployment-iothub/deployment.template.json#L97) that can assist in gathering Training Samples for use with CustomVision.AI.

![CameraTaggingModule](../assets/CameraTaggingModule.PNG)

The [Azure IoT Edge Camera Tagging Module](https://github.com/microsoft/vision-ai-developer-kit/tree/master/samples/official/camera-tagging) can assist by providing automated methods for capturing and uploading training samples from accessible RTSP streams in open and air-gapped networks, with ability to upload samples directly to CustomVision.AI or employ the [`azureblobstorageoniotedge` module](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/deployment-iothub/deployment.template.json#L161) to store and forward to an Azure Storage container.  This enables solution builders to produce varied and precise AI models using data gathered from a module running on any IoT Edge capable device.

For detailed instructions on how to use the features of the 
CameraTaggingModule, consult this [article](https://dev.to/azure/introduction-to-the-azure-iot-edge-camera-tagging-module-di8).

### Module 3.4 : The CustomVisionAI YoloParser 

The onnx formatted model that we exported from CustomVision.AI is a [YoloV2Tiny](https://pjreddie.com/darknet/yolov2/) based object detector.  [Yolo](https://pjreddie.com/darknet/yolo/) is an umbrella naming convention of object detectors created by [Joseph Redmon](https://pjreddie.com/).  The "Tiny" denotes that we are using a version of Yolov2* which targets resource constrained devices.  The "Tiny" version favors speed in exchange for the accuracy present in it's "non-Tiny" variant.  This type of model is suitable for the Jetson Nano, but could be exceeded on more powerful hardware like the Jetson Xavier family of devices.  

In this section, we will discuss Custom Yolo Parser used by DeepStream to parse the .onnx formatted CustomVision.AI model into a TensorRT engine via (`libnvdsinfer_custom_impl_Yolo.so`).  This shared object is referred to in [the Primary Inference Engine configuration file](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/DSConfig-CustomVisionAI.txt#L143) in the [value of `custom-lib-path`](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_CustomVisionAI.txt#L79).  This file also mentions a [`parse-bbox-func-name`](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_CustomVisionAI.txt#L78) which corresponds to a function originating in [`nvdsparsebbox_Yolo.cpp`](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/YoloParser/CustomVision_DeepStream5.0_JetPack4.4/nvdsparsebbox_Yolo.cpp#L457)

The CustomVisionAI YoloParser can be found at:
```
/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/YoloParser/CustomVision_DeepStream5.0_JetPack4.4
```

Within this folder, you will find the pre-built Custom Yolo Parser itself, `libnvdsinfer_custom_impl_Yolo.so`, and a Makefile along with instructions on how to build the parser from source.  This source and instructions correspond to building the parser against DeepStream5.0 running on JetPack 4.4 (The Jetson device OS / libraries version). If you intend to run on against different versions of either, you will likely need to recompile this from source.

You may be interested in modifying the [`nvdsparsebbox_Yolo.cpp`](../services/DEEPSTREAM/YoloParser/CustomVision_DeepStream5.0_JetPack4.4/nvdsparsebbox_Yolo.cpp).  For example, you can uncomment lines 432-437 to output the confidence of detected objects.  You can also modify the Non-Maximal Suppression Threshold  (`kNMS_THRESH`) and Confidence Threshold (`kPROB_THRESH`) to tune your model for better accuracy.  These parameters are explained in detail in the following [article](https://towardsdatascience.com/you-only-look-once-yolo-implementing-yolo-in-less-than-30-lines-of-python-code-97fb9835bfd2).

### Module 3.5 : The CustomYolo YoloParser

DeepStream 5.0 ships with a parser capable of working with the stock YoloV3 weights and configurations.  For details on how this parser works, you can consult the DeepStream 4.0 documentation for ["Custom YOLO Model in the DeepStream YOLO App"](https://docs.nvidia.com/metropolis/deepstream/4.0/Custom_YOLO_Model_in_the_DeepStream_YOLO_App.pdf).

The CustomYolo YoloParser can be found at:
```
/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/YoloParser/CustomYolo_DeepStream5.0_JetPack4.4
```

Within this folder, you will find the pre-built Custom Yolo Parser itself, `libnvdsinfer_custom_impl_Yolo.so`, and a Makefile along with instructions on how to build the parser from source.  This source and instructions correspond to building the parser against DeepStream5.0 running on JetPack 4.4 (The Jetson device OS / libraries version) and requires that DeepStream 5.0 has been installed onto the host. If you intend to run on against different versions of either, you will likely need to recompile this from source.

You may be interested in modifying in  `/opt/nvidia/deepstream/deepstream-5.0/sources/objectDetector_Yolo/nvdsinfer_custom_impl_Yolonvdsparsebbox_Yolo.cpp`.  Note that this file will only exist if you have installed DeepStream 5.0 on the host system.  It is important to note that if you plan on using a custom YoloV3* model with this parser, you will need to modify line 33 of this file to reflect the number of object detection classes present in your Yolo model:
```
static const int NUM_CLASSES_YOLO = 80
```

You can also modify the Non-Maximal Suppression Threshold  (`nms-iou-threshold`) and Confidence Threshold (`pre-cluster-threshold`) to tune your model for better accuracy, these are available in [config_infer_primary_yoloV3_tiny.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3_tiny.txt#L91) and [config_infer_primary_yoloV3.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3.txt).  These parameters are explained in detail in the following [article](https://towardsdatascience.com/you-only-look-once-yolo-implementing-yolo-in-less-than-30-lines-of-python-code-97fb9835bfd2).

### Module 3.6 : Using a YoloV3* Object Detection Model with NVIDIA DeepStream

This section will walk through steps to employ YoloV3 or YoloV3Tiny in a DeepStream configuration.

Yolo requires that .weights and .cfg files are present and this project does not ship with them.  They can be obtained by running:

```
cd /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/YOLOV3

./downloadYoloWeights.sh
```

Once the script has finished, you should see the following files in the `/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/YOLOV3` directory:

```
downloadYoloWeights.sh  
yolov3.cfg                        
yolov3-tiny.cfg                        
yolov3-tiny.weights
labels.txt              
yolov3.weights
```

To use YoloV3 or YoloV3Tiny with the NVIDIADeepStreamSDK module, you must update the Entrypoint of the NVIDIADeepStreamSDK module in [deployment.template.json](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/deployment-iothub/deployment.template.json#L71) to reference [DSConfig-YoloV3.txt](../services/DEEPSTREAM/configs/DSConfig-YoloV3.txt) or [DSConfig-YoloV3Tiny.txt](../services/DEEPSTREAM/configs/DSConfig-YoloV3Tiny.txt) then follow the steps in [Module 2.5](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/docs/Module%202%20-%20Configure%20and%20Deploy%20Intelligent%20Video%20Analytics%20to%20IoT%20Edge%20Runtime%20on%20NVIDIA%20Jetson.md#module-25--generate-and-apply-the-iot-hub-based-deployment-configuration) to recreate and apply the deployment.  You will also likely need to update the newly referenced config ([DSConfig-YoloV3.txt](../services/DEEPSTREAM/configs/DSConfig-YoloV3.txt) or [DSConfig-YoloV3Tiny.txt](../services/DEEPSTREAM/configs/DSConfig-YoloV3Tiny.txt)) to reference any of the customizations explained previously in [Module 2.6](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/docs/Module%202%20-%20Configure%20and%20Deploy%20Intelligent%20Video%20Analytics%20to%20IoT%20Edge%20Runtime%20on%20NVIDIA%20Jetson.md#module-26--customizing-the-sample-deployment).

On first execution, by default, DeepStream will create a TensorRT engine file for the Yolo model in it's [current working directory](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/deployment-iothub/deployment.template.json#L88) at:

```
/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs
```

The YOLOV3* configurations for [config_infer_primary_yoloV3.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3.txt#L67) and [config_infer_primary_yoloV3_tiny.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3_tiny.txt#L66) can be sped up by copying and renaming the resulting model file that is generated by DeepStream (model_b*_gpu0_fp16.engine) to the path:

```
/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/YOLOV3/
```

By default, the YOLOV3 configuration expects the engine to be named `yolov3_model_b1_gpu0_fp16.engine` whereas YOLOV3 expects the name `yolov3_tiny_model_b1_gpu0_fp16.engine`.

If DeepStream is able to reference an existing engine, (see [config_infer_primary_yoloV3.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3.txt#L67) for YoloV3 or [config_infer_primary_yoloV3_tiny.txt](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/blob/master/services/DEEPSTREAM/configs/config_infer_primary_yoloV3_tiny.txt#L66) for YoloV3Tiny), it will not need to re-build the TensorRT engine on subsequent executions which can vastly speed up the start time of your DeepStream workload.  

### Module 3.6: Next Steps

You should now have a working DeepStream Configuration that references a CustomVision.AI model or YoloV3*.  We are now ready to begin pushing object detection telemetry from our custom Intelligent Video Analytics solution into Microsoft Azure Services.  
