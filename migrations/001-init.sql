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

CREATE INDEX IX_Event_Covering ON Event(Camera, Topic, Time);

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

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE EventData;
DROP TABLE EventSource;

DROP INDEX IX_Event_Covering;
DROP TABLE Event;
