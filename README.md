# Frugal NVR #

Frugal NVR is a locally hosted Network Video Recorder with a focus on low
resource usage.

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
* MQTT integration
* Home Assistant integration

## Installation ##

### Docker & Docker Compose

Below are install instructions based on using docker & docker-compse. If your
docker environment varies, the below information is still useful for getting
it up and running.

0. Install [docker](https://docs.docker.com/engine/install/) &
  [docker-compose](https://docs.docker.com/compose/install/)
1. Create a `FrugalNVR` folder on your docker host.
2. Add a `video` and `data` sub-folder to the `FrugalNVR` folder.
2. Add a `config.yml` to the `FrugalNVR` folder. Example configuration:
  ```yml
  # REQUIRED: Set this to the hosts network name or address that Frugal NVR is
  # running on.
  hostname: my-host.lan
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
3. Add a `docker-compose.yml` to the `FrugalNVR` folder. Example configuration:
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
4. Bring up the container with `docker-compose up -d`
