--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Event (
	EventId INTEGER PRIMARY KEY
	,Camera VARCHAR(100) NOT NULL
	,Topic VARCHAR(100) NOT NULL
	,Time INTEGER NOT NULL
	,Property VARCHAR(100) NOT NULL
);

CREATE INDEX IX_Event_Covering ON Event(Time, Camera, Topic);

CREATE TABLE EventSource (
	EventSourceId INTEGER PRIMARY KEY
	,EventId INTEGER NOT NULL
	,Name VARCHAR(100) NOT NULL
	,Value VARCHAR(100)
	,FOREIGN KEY(EventId) REFERENCES Event(EventId)
);

CREATE TABLE EventData (
	EventDataId INTEGER PRIMARY KEY
	,EventId INTEGER NOT NULL
	,Name VARCHAR(100) NOT NULL
	,Value VARCHAR(100)
	,FOREIGN KEY(EventId) REFERENCES Event(EventId)
);

CREATE TABLE Segment (
    SegmentId INTEGER PRIMARY KEY
    ,Camera VARCHAR(100) NOT NULL
    ,Path VARCHAR(255) NOT NULL
	,[Date] INTEGER NOT NULL
    ,Duration INTEGER NULL
    ,Bytes INTEGER NULL
    ,Truncated Boolean NOT NULL
);

CREATE INDEX IX_Segment_Path ON Segment(Path);


--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE Segment;
DROP TABLE EventData;
DROP TABLE EventSource;

DROP INDEX IX_Event_Covering;
DROP TABLE Event;
