## Instructions to build the DeepStream YoloParser from source
2. Navigate to the following directory with:
    ```
    cd /opt/nvidia/deepstream/deepstream-6.1/sources/objectDetector_Yolo/nvdsinfer_custom_impl_Yolo
    ```
3. Clean the build environment with:
    ``` 
    make CUDA_VER=11.4 clean 
    ```
4. Build from source wtih:
    ``` 
    make CUDA_VER=11.4 
    ```
5. Copy the resulting shared object to this directory with:
    ```
    cp /opt/nvidia/deepstream/deepstream-6.1/sources/objectDetector_Yolo/nvdsinfer_custom_impl_Yolo/libnvdsinfer_custom_impl_Yolo.so /data/misc/storage/Intelligent-Video-Analytics-with-NVIDIA-Jetson-and-Microsoft-Azure/services/DEEPSTREAM/YoloParser/CustomYolo_DeepStream6.1_JetPack5.0.1
    ```