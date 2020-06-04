SELECT
    *
INTO
    [AcceleratedEdge-StreamAnalytics-Cloud-Output] 
FROM
    [AcceleratedEdge-IoTHub-Input] TIMESTAMP BY [@timestamp]