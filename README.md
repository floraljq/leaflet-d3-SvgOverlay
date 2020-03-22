# leaflet-d3-SvgOverlay.js

An overlay class for [Leaflet](http://leafletjs.com/), a JS library for interactive maps. Allows drawing overlay using SVG with the help of [D3](http://d3js.org/).



## Acknowledgement

This project is inspired by teralytics ([Leaflet.D3SvgOverlay](https://github.com/teralytics/Leaflet.D3SvgOverlay)). I just  updated it to accommodate new versions of dependency libraries and add some features after map zooming.

Thanks for his work!



## Version Required

Leaflet@1.6.0 

D3@5



## Demo

![](./img/example_1.gif)

![example_2](./img/example_2.gif)

![example_3](./img/example_3.gif)



## Basic usage

1、Include the dependency libraries:

```html
<link href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.css' rel='stylesheet' type='text/css' />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.js"></script>
  <script src="https://d3js.org/d3.v5.min.js"></script>
```

 2、Include the leaflet-d3-SvgOverlay library: 

```html
<script src="js/leaflet-d3-SvgOverlay.js"></script>
```

3、Create a map:

```
var map = L.map(...);
```

4、Create an overlay:

```javascript
var d3Overlay = L.d3SvgOverlay(function(selection, projection){

    var updateSelection = selection.selectAll('circle').data(dataset);
    updateSelection.join('circle')
        ...
        .attr("cx", function(d) { return projection.latLngToLayerPoint(d.latLng).x })
        .attr("cy", function(d) { return projection.latLngToLayerPoint(d.latLng).y });
    
}, {
      "zoomHide": true,
      "zoomDraw": false,
      "zoomAble": false,
      "interactive": true,
      "center": centerLatLng,
});
```

5、Add it to the map:

```javascript
d3Overlay.addTo(map);
```



## API

Options

|   option    | Description                                                  | Default Value | Possible values | Required                 |
| :---------: | ------------------------------------------------------------ | ------------- | --------------- | ------------------------ |
|  zoomHide   | **true:** hide the layer while zooming. Useful when overlay contains a lot of elements and animation is laggy. | false         | Bool            | no                       |
|  zoomDraw   | **true:** trigger drawCallback on after zooming is done. Useful  when you want to adjust size or width of the elements depending on zoom. | true          | Bool            | no                       |
|  zoomAble   | after Zooming :  **true:** transform (translate and scale)   **false:** transform (translate only, no scale) | true          | Bool            | no                       |
| interactive | **true:** enable event   **false:** disable event            | true          | Bool            | no                       |
|   center    | if zoomAble = false, translate reference by this point       | [0,0]         | [lat, lng]      | if zoomAble = false, yes |

*Factory method*

```
L.d3SvgOverlay(<function> drawCallback, <options> options?)
```

- `drawCallback` - callback to draw/update overlay contents, it's called with arguments:
- `options` - overlay options object:

*Drawing callback function*

```
drawCallback(selection, projection)
```

- `selection` - D3 selection of a parent element for drawing. Put your SVG elements bound to data here
- `projection` - projection object. Contains methods to work with layers coordinate system and scaling

*Overlay options object*

*Projection object*

available methods/fields:

- `latLngToLayerPoint(latLng, zoom?)` - (function) returns `L.Point` projected from `L.LatLng` in the coordinate system of the overlay.
- `layerPointToLatLng(point, zoom?)` - (function) returns `L.LatLng` projected back from `L.Point` into the original CRS.
- `unitsPerMeter` - (float) this is a number of the overlay coordinate system units in 1 meter. Useful to get dimensions in meters.
- `scale` - scale of current zoom compared to the zoom level of overlay coordinate system. Useful if you want to make your elements of a size independent of zoom. Just divide the size by the scale.
- `map` - reference to the `L.Map` object, useful to get map state (zoom, viewport bounds, etc), especially when having multiple maps in the page.
- `layer` - reference to the `L.D3SvgOverlay` object, useful for extending behavior of the overlay.
- `pathFromGeojson` - a [d3.geo.path](https://github.com/mbostock/d3/wiki/Geo-Paths#path) path generator object that can generate *SVG Path* projected into the overlay's coordinate system from any [GeoJSON](http://geojson.org/)



## Optimized part compared with [teralytics](https://github.com/teralytics/Leaflet.D3SvgOverlay)

1、Compatible with Leaflet@1.6.0  and d3@5，you can use event (eg.  click mouseover) on this layer.

2、After Zooming, you can choose either change position and size of the svg (eg. `transform (translate, scale)` , userful for geojson data)  or  change position of the svg only (eg. `transform (translate)` , userful for marker element) .