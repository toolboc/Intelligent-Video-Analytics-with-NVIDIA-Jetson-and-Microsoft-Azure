SELECT
    *
INTO
    [StreamAnalytics-Cloud-Output] 
FROM
    [IoTHub-Input] TIMESTAMP BY [@timestamp]