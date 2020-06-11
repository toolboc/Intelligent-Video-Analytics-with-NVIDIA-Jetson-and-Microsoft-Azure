## Module 2 : Configure and Deploy "Intelligent Video Analytics" to IoT Edge Runtime on NVIDIA Jetson

In this section we will install and configure the IoT Edge Runtime on an NVIDIA Jetson Device.  This will require that we deploy a collection of Azure Services to support the modules that are defined in the associated [IoT Edge Deployment for IoT Hub](../deployment-iothub/deployment.template.json).

If you take a close look at the deployment, you will notice that it includes the following modules:

| Module                    | Purpose                                                                                                                         | Backing Azure Service                                                    |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| edgeAgent                 | System Module used by IoT Edge to deploy and ensure uptime of modules defined in device deployment                              | [Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/?WT.mc_id=julyot-iva-pdecarlo) (Authorization and for obtaining deployment configuration) |
| edgeHub                   | System Module responsible for inter-module communication and message back to Azure IoT Hub                                       | [Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/?WT.mc_id=julyot-iva-pdecarlo) (Ingestion of Device to Cloud Telemetry)                   |
| NVIDIADeepStreamSDK       | Custom Module which runs DeepStream workload, output is forwarded to DeepStreamAnalytics Module for summarization               | Telemetry is routed to DeepStreamAnalytics module (see: [IoT Edge - Declare Routes](https://docs.microsoft.com/en-us/azure/iot-edge/module-composition#declare-routes?WT.mc_id=julyot-iva-pdecarlo)) where it is filtered and forwarded to an [Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/?WT.mc_id=julyot-iva-pdecarlo)                                                                     |
| CameraTaggingModule       | Custom Module for obtaining images from available RTSP sources for use in Training Custom Object Detection Models               | [CustomVision.AI](https://www.customvision.ai/?WT.mc_id=julyot-iva-pdecarlo) for exporting of captured images for use in training Custom Object Detection model(s)                        |
| azureblobstorageoniotedge | Custom Module for providing replication of data to a backing Azure Storage Account                                              | [Azure Storage Account](https://docs.microsoft.com/en-us/azure/storage/?WT.mc_id=julyot-iva-pdecarlo) for replication and long-term storage of captured images   |
| DeepStreamAnalytics       | Custom Module that employs "Stream Analytics on IoT Edge" Module to Summarize Object Detection Results from NVIDIADeepStreamSDK | [Azure Stream Analytics on Edge](https://docs.microsoft.com/en-us/azure/stream-analytics/stream-analytics-edge?WT.mc_id=julyot-iva-pdecarlo) Job defined and served from Azure                                   |

In this section, we will only need to deploy an [Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/?WT.mc_id=julyot-iva-pdecarlo) and [Azure Storage Account](https://docs.microsoft.com/en-us/azure/storage/?WT.mc_id=julyot-iva-pdecarlo). If you are curious about the pricing involved for these services, they are summarized below:

* [IoT Hub Pricing](https://azure.microsoft.com/en-us/pricing/details/iot-hub/?WT.mc_id=julyot-iva-pdecarlo)
* [Azure Storage Account](https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure?WT.mc_id=julyot-iva-pdecarlo)
* [Azure Stream Analytics on Edge Pricing](https://azure.microsoft.com/en-us/pricing/details/stream-analytics/?WT.mc_id=julyot-iva-pdecarlo) (Technically, even though we are using a job that is not contained in the end-users subscription, billing does occur per device that runs the DeepStreamAnalytics Module)

The additional services, [CustomVision.AI](https://www.customvision.ai/?WT.mc_id=julyot-iva-pdecarlo) and [Azure Stream Analytics on Edge](https://docs.microsoft.com/en-us/azure/stream-analytics/stream-analytics-edge?WT.mc_id=julyot-iva-pdecarlo), will be addressed in upcoming sections and will not be needed at this time.  

### Module 2.1 : Install IoT Edge onto the Jetson  Device

Before we install IoT Edge, we need to install a few utilities onto the Nvidia Jetson device with:

```
sudo apt-get install -y curl nano 
```

ARM64 builds of IoT Edge that are compatible with NVIDIA Jetson Hardware are provided beginning in the [1.0.8 release tag](https://github.com/Azure/azure-iotedge/releases/tag/1.0.8) of IoT Edge.  To install the latest release of IoT Edge, run the following from a terminal on your Nvidia Jetson device or consult the [official documentation](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-install-iot-edge-linux?WT.mc_id=julyot-iva-pdecarlo):

```
# You can copy the entire text from this code block and 
# paste in terminal. The comment lines will be ignored.

# Install the IoT Edge repository configuration
curl https://packages.microsoft.com/config/ubuntu/18.04/multiarch/prod.list > ./microsoft-prod.list

# Copy the generated list
sudo cp ./microsoft-prod.list /etc/apt/sources.list.d/

# Install the Microsoft GPG public key
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo cp ./microsoft.gpg /etc/apt/trusted.gpg.d/

# Perform apt update
sudo apt-get update

# Install IoT Edge and the Security Daemon
sudo apt-get install iotedge

```

After installation, you will receive the following message indicating the need to update the device's configuration, we'll address this in the next step:

```
===============================================================================

                              Azure IoT Edge

  IMPORTANT: Please update the configuration file located at:

    /etc/iotedge/config.yaml

  with your device's provisioning information. You will need to restart the
  'iotedge' service for these changes to take effect.

  To restart the 'iotedge' service, use:

    'systemctl restart iotedge'

    - OR -

    /etc/init.d/iotedge restart

  These commands may need to be run with sudo depending on your environment.

===============================================================================
```

### Module 2.2 : Provision the IoT Edge Runtime on the Jetson Device

In this section, we will manually provision our Jetson hardware as an IoT Edge device.  To accomplish this, we will need to deploy an active IoT Hub which we will use to register a new IoT Edge device and from there obtain a device connection string that we will allow us to securely authenticate to the IoT Hub instance. 

You can create a new IoT Hub, register an IoT Edge device, and obtain the device connection string needed to accomplish this by following the documentation for [Registering an IoT Edge device in the Azure Portal](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-register-device-portal?WT.mc_id=julyot-iva-pdecarlo) or by [Registering an IoT Edge device with the Azure-CLI](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-register-device-cli?WT.mc_id=julyot-iva-pdecarlo).

Once you have obtained a connection string, open the IoT Edge device configuration file:

```
sudo nano /etc/iotedge/config.yaml
```

Find the provisioning section of the file and uncomment the manual provisioning mode. Update the value of `device_connection_string` with the connection string from your IoT Edge device.

```
provisioning:
  source: "manual"
  device_connection_string: "<ADD DEVICE CONNECTION STRING HERE>"
  
# provisioning: 
#   source: "dps"
#   global_endpoint: "https://global.azure-devices-provisioning.net"
#   scope_id: "{scope_id}"
#   registration_id: "{registration_id}"

```

After you have updated the value of `device_connection_string`, restart the iotedge service with:

```
sudo service iotedge restart
```

You can check the status of the IoT Edge Daemon using:

```
systemctl status iotedge
```

Examine daemon logs using:
```
journalctl -u iotedge --no-pager --no-full
```

And, list running modules with:

```
sudo iotedge list
```

To ensure that the IoT Edge Runtime is configured and running:

```
sudo service iotedge status
```

A successfully configured device should report output similar to the following, if there are any errors, double-check the configuration has been set appropriately:

```
● iotedge.service - Azure IoT Edge daemon
   Loaded: loaded (/lib/systemd/system/iotedge.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2020-06-08 13:04:44 CDT; 15s ago
     Docs: man:iotedged(8)
 Main PID: 9029 (iotedged)
    Tasks: 11 (limit: 4183)
   CGroup: /system.slice/iotedge.service
           └─9029 /usr/bin/iotedged -c /etc/iotedge/config.yaml
```

The IoT Edge runtime will begin pulling down the edgeAgent and edgeHub system modules.  These modules will run by default until we supply a deployment configuration containing additional modules.

### Module 2.3 : Prepare the Jetson Device to use the "Intelligent Video Analytics" sample configurations

In this module, we will mirror the sample configurations contained in this repo onto the Jetson device.  This will require that we leverage some very specific paths that are referenced in those configurations, so be sure to follow these steps exactly as they are described.  

We will begin by creating a directory to store the configuration on the Jetson device with:

```
sudo mkdir -p /data/misc/storage
```

Next, we will configure the `/data` directory and all subdirectories to be accessible from a non-privileged user account with:

```
sudo chmod -R 777 /data
```

Next, we will navigate to `/data/misc/storage` with:
```
cd /data/misc/storage
```

Then clone this repository to that directory with:
```
git clone https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure.git
```

Next, we need to configure the Jetson OS to allow for access to the X11 Window server from a container by granting local privileges to the X11 socket to the `iotedge` user account.

```
xhost local:iotedge
```

This will activate the privileges for the current logged-in session, but will not persist on reboot. Make the configuration persistent by opening `/etc/profile` for editing with:

```
sudo nano /etc/profile
```

Then append the following text to the very top of that file:
```
xhost local:iotedge
```

On subsequent reboots, the `iotedge` user should now be able to spawn Graphical User Interfaces using the host X11 socket.  This will allow us to view the bounding-box detections of the DeepStreamSDK module while running as an IoT Edge module (i.e. while running as a container).

To make diagnosing potential issues easier, you will also want to enable access to the docker service from your user account.  This can be accomplished with:

```
sudo usermod -aG docker $USER
```

On subsequent login sessions, you will now be able to invoke `docker` command without the need to prepend with `sudo`.

We have successfully prepared the Jetson Device to use the "Intelligent Video Analytics" sample configurations.  Next, we will configure the appropriate prerequisite Azure Storage Account and configuration needed for the Blob Storage Module (azureblobstorageoniotedge).

### Module 2.4 : Configure the Blob Storage Module Dependencies

In this step, we will configure the [IoT Edge Blob Storage Module](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-deploy-blob?WT.mc_id=julyot-iva-pdecarlo) which is used in conjunction with the CameraTaggingModule to store image captures locally and replicate them to the cloud.  Technically, this module is optional and the CameraTaggingModule can upload images directly to the cloud or CustomVision.AI without it, but it gives a more robust solution for the end user that can capture and store images without the need for outbound internet access.  You can learn more about the Camera Tagging Module an it's supporting features in this [in-depth article](https://dev.to/azure/introduction-to-the-azure-iot-edge-camera-tagging-module-di8).

This module will require the use of Visual Studio Code, preferably running on a development machine that is not the Jetson device.  Begin by cloning this repository to your development machine by navigating into the directory of your choosing and running:

```
git clone https://github.com/toolboc/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure.git
```

Next, Open Visual Studio Code, then select "File => Open Folder" then navigate to and select the newly created "Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure" folder.

 Within the newly opened project, create a file named .env in the `deployment-iothub` folder and supply it with the following contents:

```
CONTAINER_REGISTRY_NAME=
LOCAL_STORAGE_ACCOUNT_KEY=
LOCAL_STORAGE_ACCOUNT_NAME=camerataggingmodulelocal
DESTINATION_STORAGE_NAME=camerataggingmodulecloud
CLOUD_STORAGE_CONNECTION_STRING=
```

This file will will store key/value that are used to replace values in deployment.template.json to produce a working deployment manifest. You will notice these entries in the deployment.template.json are proceeded with the '$' symbol.  This marks them as tokens for replacement during the generation of the deployment manifest.

For now, we will skip the `CONTAINER_REGISTRY_NAME` as that is only needed if you are pulling container images from a private repository.  Since the modules in our deployment are all publicly available, it is not needed at this time.

Produce a value for `LOCAL_STORAGE_ACCOUNT_KEY` by visiting [GeneratePlus](https://generate.plus/en/base64).  This will generate a random base64 encoded string that will be used to configure a secure connection to the local blob storage instance.  You will want to supply the entire result, which should end with two equal signs (*==*).

`LOCAL_STORAGE_ACCOUNT_NAME` is best left as-is, but you are welcome to rename it, provided that it follows the format for naming: The field can contain only lowercase letters and numbers and the name must be between 3 and 24 characters.

`DESTINATION_STORAGE_NAME` is supplied from an assumed-to-exist blob storage container in the Azure Cloud.  You can create this container by performing the following steps:

![Storage Overview](../assets/AzureStorageOverview.PNG)

Create a new storage container named "camerataggingmodulecloud" as shown below (the name is important as it matches the value in the .env):

![New Container](../assets/AzureStorageContainerCreate.PNG)

CLOUD_STORAGE_CONNECTION_STRING can be obtained by visiting your newly created Storage Account and selecting **Settings** => **Access Keys**.  Copy the entire contents of the **Connection string** and supply this as the value.

![Obtain Connection String](../assets/AzureStorageConnectionString.PNG)

Your completed .env file should look similar to the following:
```
CONTAINER_REGISTRY_NAME=
LOCAL_STORAGE_ACCOUNT_KEY=9LkgJa1ApIsISmuUHwonxg==
LOCAL_STORAGE_ACCOUNT_NAME=camerataggingmodulelocal
DESTINATION_STORAGE_NAME=camerataggingmodulecloud
CLOUD_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=camerataggingmodulestore;AccountKey=00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==;EndpointSuffix=core.windows.net
```

We are now ready to create and apply the sample deployment specified in the`deployment-iothub`.

### Module 2.5 : Generate and Apply the IoT Hub based deployment configuration 

Now that we have accounted for all of the pre-requisite services, setup, and configuration; we are ready to produce a deployment to begin running a sample Intelligent Video Analytics pipeline on our Jetson device.  The following steps will take place in Visual Studio Code, again, preferably running on a development machine which is not the Jetson Device itself.

In the previous section, we created a .env file to support the configuration parameters needed by the Blob Storage Module.  That .env file should be located in the `deployment-iothub` folder.  Ensure that you have supplied the appropriate parameters and that the .env file exists before proceeding.

Next, we will configure the project to target the arm64v8 platform. To accomplish this, bring up the Command Pallette with (CTRL+SHIFT+P), then search for the following task: 

```
Azure IoT Edge: Set Default Target Platform for Edge Solution
```

Select the "Azure IoT Edge: Set Default Target Platform for Edge Solution" task and a drop-down will appear showing all available platforms. Select `arm64v8` from the list.  This will ensure that any modules added to the project and built-from source are targeted to the Jetson architecture.

Note: If you do not see any results when searching for the task above, ensure that you have installed the [Azure IoT Tools Extension](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-tools).

Bring up the Command Pallette again with (CTRL+SHIFT+P), this time search for:

```
Azure IoT Hub: Select IoT Hub
```

Select the "Azure IoT Hub: Select IoT Hub" task and follow the prompts to connect to the IoT Hub that was used to register and configure the IoT Edge runtime on your Jetson Device.  This may require that you authenticate your Visual Studio Code instance with Microsoft Azure if you have never done so before.

After you have selected the appropriate IoT Hub, expand the `deployment-iothub` folder and right-click the `deployment.template.json` file, then select "Generate IoT Edge Deployment Manifest".  This will produce a new folder in that directory named "config" and an associated deployment named `deployment.arm64v8.json`.  Right-click the `deployment.arm64v8.json` file and select "Create Deployment for Single Device".

A drop-down should appear showing all devices registered in your currently selected IoT Hub.  Choose the device that represents your Jetson Device and the deployment will begin to activate on your device (provided the IoT Edge runtime is active and that the device is connected to the internet).

It may take a while for the images specified in the deployment to pull down to the device.  You can verify that all images are pulled with:

```
sudo docker images
```

A completed deployment should eventually show a result similar to the following output:

```
REPOSITORY                                              TAG                   IMAGE ID            CREATED             SIZE
mcr.microsoft.com/azureiotedge-hub                      1.0                   9b62dd5f824e        7 days ago          237MB
mcr.microsoft.com/azureiotedge-agent                    1.0                   ae9bfb3081c5        7 days ago          219MB
nvcr.io/nvidia/deepstream-l4t                           5.0-dp-20.04-iot      7b4457646f87        5 weeks ago         2.16GB
toolboc/camerataggingmodule                             latest                704e9e0ce6dc        6 weeks ago         666MB
mcr.microsoft.com/azure-stream-analytics/azureiotedge   1.0.6-linux-arm32v7   bb2d6fbc5a3b        4 months ago        566MB
mcr.microsoft.com/azure-blob-storage                    latest                76f2e7849a91        11 months ago       203MB
```

When you are certain that the deployment has completed, it is now possible to modify the solution to your needs.  This will be explained in the next section.

### Module 2.6 : Customizing the Sample Deployment 

This section is a bit open-ended as it will depend on how you intend to process video input on your Jetson Device.  

Before making any modifications, it is highly advised to consult the [DeepStream Documentation for Configuration Groups](http://aka.ms/DeepStreamDevGuide) and remember that everything should be tracked using 'git' so recovery is always possible.  

The un-modified sample deployment references a DeepStream configuration located on your Jetson Device at `/data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs`.  Within this directory there will be some additional example DeepStream Configurations:

| DeepStream Sample Configuration Name | Description                                                                                                                                                                                                |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| DSConfig-CustomVisionAI.txt          | Employs an example object detection model created with CustomVision.AI that is located in /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/CUSTOM_VISION_AI  |
| DSConfig-YoloV3.txt                  | Employs an example object detection model based on [YoloV3](https://pjreddie.com/darknet/yolo/)                                                                                                            |
| DSConfig-YoloV3Tiny.txt              | Employs an example object detection model based on [YoloV3Tiny](https://pjreddie.com/darknet/yolo)   

Each of these examples are configured by default to process a single video input from a [publicly available RTSP stream of Big Buck Bunny](https://www.wowza.com/html/mobile.html).  We do this partially because it is the ONLY reliable and publicly accessible RTSP stream on the entire internet and to make it super easy to modify the existing example to point to a custom RTSP endpoint for say, an IP capable security camera.  

To change the active DeepStream configuration in your deployment, you can modify the `deployment.template.json` to specify a different configuration file within the `ENTRYPOINT` specification for the `NVIDIADeepStreamSDK` module, then repeat the steps in Module 2.5 to regenerate and apply the modified deployment. Note that using the YoloV3* configurations will require that you bring in some additional dependencies which will be discussed in Module 3.  

In the default deployment that we applied, the DeepStream confiuration, DSConfig-CustomVisionAI.txt can be modified on your Jetson device with:

```
nano /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs/DSConfig-CustomVisionAI.txt
```

After you have made edits to this configuration, restart the NVIDIADeepStreamSDK module to test it with:
```
docker restart NVIDIADeepStreamSDK
```

To monitor the logs, you can use:
```
iotedge logs NVIDIADeepStreamSDK
```

OR

```
docker logs -f NVIDIADeepStreamSDK
```

For each of your input sources, you will want to ensure that each of them is provided an entry in msgconv_config.txt by modifying with:
```
nano /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/configs/msgconv_config.txt
```

This file is used to generate telemetry to the Azure IoT Hub and to specify which video input / camera that a given object detection originated from.

One last note, if you are modifying the DeepStream configuration to use multiple video sources,you will want to modify the `[streammux]` `batch-size` property to equal the number of video sources you are using for optimal performance.  For example, if you have modified the DeepStream Configuration to use four input RTSP streams, you will want to set `[streammux]` `batch-size` = 4, in your modified DeepStream configuration.

Once you have modified the configuration to obtain video sources from your desired inputs, we will now be ready to look into how to create and deploy Custom Object Detection Model from CustomVision.AI and explore the usage of academic grade models using the YOLOV3* configurations. 