--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Segment (
    SegmentId INTEGER PRIMARY KEY
    ,Camera VARCHAR(100) NOT NULL
    ,Path VARCHAR(255) NOT NULL
    ,Time INTEGER NULL
    ,Bytes INTEGER NULL
    ,Truncated Boolean NOT NULL
);

CREATE INDEX IX_Segment_Path ON Segment(Path);

-- Fix original index
DROP INDEX IX_Event_Covering;
CREATE INDEX IX_Event_Covering ON Event(Time, Camera, Topic);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

-- Restore original index
DROP INDEX IX_Event_Covering;
CREATE INDEX IX_Event_Covering ON Event(Camera, Topic, Time);

DROP TABLE Segment;
