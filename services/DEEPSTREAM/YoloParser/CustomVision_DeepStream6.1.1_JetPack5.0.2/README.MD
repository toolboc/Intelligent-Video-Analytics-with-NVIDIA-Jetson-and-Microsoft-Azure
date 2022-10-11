## Instructions to build the CustomVision DeepStream YoloParser from source
1. Ensure that you have installed the DeepStream 6.1.1 sources included in the [DeepStream Installer](https://developer.nvidia.com/deepstream-getting-started)
2. Clean the build environment with:
    ``` 
    make CUDA_VER=11.4 clean 
    ```
3. Build from source wtih:
    ``` 
    make CUDA_VER=11.4 
    ```
