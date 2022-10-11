## Instructions to build the DeepStream YoloParser from source
1. Ensure that you have installed the DeepStream 5.0 sources included in the [DeepStream Installer](https://developer.nvidia.com/deepstream-getting-started)
2. Navigate to the following directory with:
    ```
    cd /opt/nvidia/deepstream/deepstream-5.0/sources/objectDetector_Yolo/nvdsinfer_custom_impl_Yolo
    ```
3. Clean the build environment with:
    ``` 
    make CUDA_VER=10.2 clean 
    ```
4. Build from source with:
    ``` 
    make CUDA_VER=10.2 
    ```
5. Copy the resulting shared object to this directory with:
    ```
    cp /opt/nvidia/deepstream/deepstream-5.0/sources/objectDetector_Yolo/nvdsinfer_custom_impl_Yolo/libnvdsinfer_custom_impl_Yolo.so /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/YoloParser/CustomYolo_DeepStream5.0_JetPack4.4
    ```