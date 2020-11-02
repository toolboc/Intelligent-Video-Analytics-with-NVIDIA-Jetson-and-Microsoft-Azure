WITH
FlattenedDetections AS 
(
    SELECT 
        DeepStreamInput.sensorId,
        (SUBSTRING (arrayElement.ArrayValue, REGEXMATCH(arrayElement.ArrayValue, '\|[a-z]') + 1, LEN(arrayElement.ArrayValue))) as object,
        DeepStreamInput.[@timestamp], COUNT(DeepStreamInput.[@timestamp]) as matches
    FROM
        [DeepStreamInput] AS DeepStreamInput TIMESTAMP BY DeepStreamInput.[@timestamp] 
        CROSS APPLY GetArrayElements(objects) AS arrayElement 
    WHERE
       DeepStreamInput.[@timestamp]  != '1970-01-01T00:00:00.000Z' /*filter RTSP disconnections*/
       GROUP BY DeepStreamInput.[sensorId], 
                arrayElement, 
                DeepStreamInput.[@timestamp],
                SYSTEM.TIMESTAMP()
)

SELECT
    Count(object) AS count, /*Counting function*/
    sensorId, object, [@timestamp]
INTO [AggregatedDetections] 
FROM FlattenedDetections  
    WHERE matches = 1 /*Filter duplicates where (timestamp and object) are equal)*/
    GROUP BY
        sensorId,
        object,
        [@timestamp],
        TumblingWindow(second, 15)

SELECT 
    FLOOR(AVG(count)) as count, /*Smoothing function*/
    sensorId, object, System.Timestamp AS [@timestamp]
INTO [SummarizedDetections]
FROM AggregatedDetections 
GROUP BY 
    sensorId,
    object,
    TumblingWindow(second, 15)

