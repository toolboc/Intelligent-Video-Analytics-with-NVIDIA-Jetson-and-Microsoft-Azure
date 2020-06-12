## Module 1 - Introduction to NVIDIA DeepStream

The [NVIDIA DeepStream SDK](https://developer.nvidia.com/deepstream-sdk) delivers a complete streaming analytics toolkit for AI based video and image understanding and multi-sensor processing. DeepStream SDK features hardware-accelerated building blocks, called plugins that bring deep neural networks and other complex processing tasks into a stream processing pipeline.

The deepstream offering contains the DeepStream SDK which include an app (deepstream-test5) that is configurable to handle multiple streams and multiple networks for inference. The app can be connected to the [Azure IoT Edge runtime](https://docs.microsoft.com/en-us/azure/iot-edge/about-iot-edg?WT.mc_id=julyot-iva-pdecarlo) to send messages to a configured [Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/?WT.mc_id=julyot-iva-pdecarlo). 

The [DeepStream SDK is offered in the Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/nvidia.deepstream-iot?WT.mc_id=julyot-iva-pdecarlo) as an [IoT Edge Module](https://docs.microsoft.com/en-us/azure/iot-edge/quickstart-linux?WT.mc_id=julyot-iva-pdecarlo).  We will employ this mechanism to configure and run a DeepStream workload on an NVIDIA embedded device.

Before continuing, it is highly suggested to familiarize with the [DeepStream SDK Documentation](http://aka.ms/deepstreamdevguide), as it will provide you with the details on how to customize the Intelligent Video Analytics solution to your needs.

We cover pretty much everything you need to know in this 90 minute livestream titled "[Getting Started with NVIDIA Jetson: Object Detection](https://www.youtube.com/watch?v=yZz-4uOx_Js)".  We highly recommend that you give a watch before proceeding to the next section.

[![Getting Started with NVIDIA Jetson: Object Detection](../assets/LiveStream1.PNG)](https://www.youtube.com/watch?v=yZz-4uOx_Js)