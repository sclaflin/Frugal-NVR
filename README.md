# Frugal NVR #

Frugal NVR is a locally hosted Network Video Recorder with a focus on low
resource usage.

For example, a Libre Computer "Le Potato" (a rough equivalent to a Raspberry PI
3) runs about 30% - 50% CPU utilization with the following:
 - 8 1080p concurrent streams
 - 3 2k concurrent streams
 - disabled composite view
 - 60 seconds delay between video segment scans on disk

![Real time statistics](/images/stats.png)

![Composite overview](/images/overview.png)

![Camera view](/images/camera.png)

***Please note: This project is in a very early stage of development. The API is
currently very unstable and not suitable for anyone that's not into tinkering as
things evolve.***

## Features ##

* IP camera based motion detection
* Continuous recording of camera streams
* Configurable video retention time
* Logging of ONVIF camera motion events
* HTTP live stream of monitored cameras
* Tuned for low CPU usage
* Web-based UI
  * Real-time statistics
  * Composite overview
  * Live camera feed

## Requirements ##

* IP camera(s) that:
    * support ONVIF
    * provide H264 video streams

## Roadmap ##

* Multiple build targets
* Tighter integration with ONVIF (PTZ & more)
* Hardware accelleration
* AI inference & hardware support
* MQTT integration
* Home Assistant integration

## Installation ##

### Docker & Docker Compose

Below are install instructions based on using docker & docker-compose. If your
docker environment varies, the below information is still useful for getting
it up and running. ARMv7 & AMD64 builds are available.

0. Install [docker](https://docs.docker.com/engine/install/) &
  [docker-compose](https://docs.docker.com/compose/install/)
1. Create a `FrugalNVR` folder on your docker host.
2. Add a `video` and `data` sub-folder to the `FrugalNVR` folder.
3. Add a `config.yml` to the `FrugalNVR` folder. Example configuration:
  ```yml
  # REQUIRED: Set this to the hosts network name or address that Frugal NVR is
  # running on.
  hostname: my-host.lan
  # REQUIRED: Set this to where you would like Frugal to place temporary files.
  # On Linux based hosts, /dev/shm is a good choice as it is using computer 
  # memory to save wear and tear on physical drives.
  tempPath: /your/temp/path
  # OPTIONAL: Default is "ffmpeg". Set this to the ffmpeg binary on your system.
  # If ffmpeg is on your system path, the default is sufficient.
  ffmpegPath: ffmpeg
  # OPTIONAL: Default is "mediainfo". Set this to the mediainfo binary on your
  # system. If mediainfo is on your system path, the default is sufficient.
  mediainfoPath: mediainfo
  # OPTIONAL: Default is "/app/videos". The path that video streams will be
  # recorded to. Must be an absolute path.
  videoPath: /app/videos
  # OPTIONAL: Default is "24". How many hours of recorded camera streams to 
  # retain.
  retainHours: 24
  # OPTIONAL: Default is 10. How many seconds to wait before updating statistics
  # on a segment. Resource constrained hosts should pick a larger number as this
  # is (relatively) CPU intensive.
  segmentUpdateFrequency: 10
  # OPTIONAL: Default is "/app/data". The path that the SQLite database will be
  # kept.
  dbPath: /app/data
  # OPTIONAL: Default is 'info'. Set how verbose FrugalNVR is on the console.
  # Choices are debug, info, warn, error, and fatal.
  logLevel: info
  # MQTT based interface for camera
  mqtt:
    # OPTIONAL: Default is "false". Enables the MQTT client
    enable: false
    # REQUIRED if enabled: Url to your MQTT instance
    url: mqtt://your-mqtt-host
    # OPTIONAL: Default is 'frugal-nvr'. Sets the base topic that Frugal NVR
    # will publish to.
    baseTopic: frugal-nvr
    # Home Assistant Auto Discovery support.
    hassDiscovery:
      # OPTIONAL: Default is "false". Enables support for Home Assistant auto
      # discovery.
      enable: true
      # OPTIONAL: Default is 'homeassistant'. Sets the base topic of
      # homeassistant.
      discoveryPrefix: homeassistant
    # OPTIONAL: Connection options can be found here
    # https://github.com/mqttjs/MQTT.js#client
    mqttOptions:
      username: my-username
      password: my-password
  # The Web UI is the web-based interface to view the camera streams.
  webUI:
    # OPTIONAL: Default is "true". Enables the Web UI.
    enable: true
    # OPTIONAL: Default is "3000".
    port: 3000
    # The overview is a composite of all camera streams.
    overview:
        # OPTIONAL: Default is "true". Enables the overview,  Set to false to
        # save host memory and CPU.
        enable: true
        # OPTIONAL: Default is 540. Sets the width of the thumbnail images
        # generated for the overview. Smaller is faster, bigger is prettier. :)
        thumbnailWidth: 540
  # The media server provides FLV live streams of the cameras being monitored.
  mediaServer:
    http:
      # REQUIRED: Default is "8000".
      port: 8000
  # OPTIONAL: Global ONVIF settings to be applied to all cameras. If overriding
  # settings are not defined for a specific camera, these settings will be used.
  onvif:
    username: my-username
    password: my-password
  # REQUIRED: List of cameras to be monitored.
  cameras:
    # REQUIRED: The name to be used for a particular camera.
    - name: Camera One
      # OPTIONAL (if no global settings): Camera specific ONVIF settings.
      onvif:
        # REQUIRED: Host name or IP of the camera
        hostname: camera-one.lan
    # MOAR CAMERAS!
    - name: Camera Two
      onvif:
        hostname: camera-two.lan
  ```
4. Add a `docker-compose.yml` to the `FrugalNVR` folder. Example configuration:
  ```yml
  services:
  frugal-nvr:
    container_name: frugal-nvr
    restart: unless-stopped
    image: sclaflin/frugal-nvr:latest
    # Sets the size of /dev/shm. Frugal tends to have a lot of read/write
    # operations of temporary files. The shared memory disk is used to save wear
    # and tear on drives. Set this to a value large enough to accommodate the
    # largest video clips you think you may need. A good start is 500mb.
    shm_size: 500mb
    # Set this to your local time zone. Please note that this is important
    # to keep the WebUI working properly.
    environment:
      - TZ=America/Chicago
    # Expose the WebUI & Media Server ports
    ports:
      - 8000:8000
      - 3000:3000

    volumes:
      # Mount your hosts storage locations for video & data
      - ./videos:/app/videos
      - ./data:/app/data
      # Mount your config file to make it do the things (and stuff).
      - ./config.yml:/app/config.yml
  ```
5. Bring up the container with `docker-compose up -d`

### Bare Metal ###

FrugalNVR requires the following pre-requisites:

* [node.js](https://nodejs.org/en) >= v18.15.0 LTS
* [ffmpeg](https://ffmpeg.org/) >= 4.3.5
* [mediainfo](https://mediaarea.net/en/MediaInfo) >= 20.09

1. Clone this repository.
2. Change directory into the `FrugalNVR` folder.
2. Add a `config.yml` file. Use the above example configuration above.
4. Install nodejs dependencies with `npm ci`
5. Build the webUI with `npm run buildUI`
6. Start it up with `node index.js`
7. Set up a watchdog / system service to keep it running.

## Development ##

This application is developed within a VSCode devcontainer.

1. Clone this repository.
2. Open the project in VSCode.
3. CTRL+SHIFT+P: Reopen in Container.
4. Add a `config.yml` file. Use the above example configuration above.
5. Install nodejs dependencies with `npm ci`
6. `npm run debugUI` to start parcel and get hacking on the UI. Point your browser to http://localhost:1234
7. `node index.js` to get it running.
