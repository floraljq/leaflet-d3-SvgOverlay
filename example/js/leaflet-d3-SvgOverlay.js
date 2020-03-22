(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['leaflet', 'd3'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('leaflet', 'd3'));
    } else {
        factory(L, d3);
    }
}(function (L, d3) {

    if (typeof d3 == "undefined") {
        throw "D3 SVG Overlay for Leaflet requires D3 library loaded first";
    }
    if (typeof L == "undefined") {
        throw "D3 SVG Overlay for Leaflet requires Leaflet library loaded first";
    }

    L.D3SvgOverlay = L.Layer.extend({

        _undef: function (a) { return typeof a == "undefined" },

        _options: function (options) {
            if (this._undef(options)) {
                return this.options;
            }
            options.zoomHide = this._undef(options.zoomHide) ? false : options.zoomHide;
            //缩放后是否重绘
            options.zoomDraw = this._undef(options.zoomDraw) ? true : options.zoomDraw;
            //true：zoom时平移缩放  false: zoom时只平移不缩放
            options.zoomAble = this._undef(options.zoomAble) ? true : options.zoomAble;
            //是否具有交互事件
            options.interactive = this._undef(options.interactive) ? true : options.interactive;
            //中心点，当options.zoomAble = false时，根据中心点进行平移
            options.center = this._undef(options.center) ? [0, 0] : options.center;

            L.Util.setOptions(this, options);
        },

        _disableLeafletRounding: function () {
            this._leaflet_round = L.Point.prototype._round;
            L.Point.prototype._round = function () { return this; };
        },

        _enableLeafletRounding: function () {
            L.Point.prototype._round = this._leaflet_round;
        },

        draw: function () {
            this._disableLeafletRounding();
            this._drawCallback(this.selection, this.projection, this.map.getZoom());

            //如果只平移，不缩放，则移动到中心点
            if (!this.options.zoomAble) {
                var shift = this.map.latLngToLayerPoint(L.latLng(this.options.center));
                this._rootGroup.attr("transform", "translate(" + shift.x + "," + shift.y + ") ");
            }

            //如果具有交互事件，则将path设置为可交互的
            if (this.options.interactive) {
                this._childGroup = this._svg._rootGroup.childNodes;
                for (i in this._childGroup) {
                    if (this._childGroup[i].tagName == 'path') {
                        L.DomUtil.addClass(this._childGroup[i], 'leaflet-interactive');
                        this.addInteractiveTarget(this._childGroup[i]);
                    }
                }
            }

            this._enableLeafletRounding();
        },

        initialize: function (drawCallback, options) { // (Function(selection, projection)), (Object)options
            this._options(options || {});
            this._drawCallback = drawCallback;
        },

        _zoomChange: function (evt) {
            this._disableLeafletRounding();

            //如果只平移，不缩放，则移动到中心点
            if (!this.options.zoomAble) {
                var shift = this.map.latLngToLayerPoint(L.latLng(this.options.center));
                this._rootGroup.attr("transform", "translate(" + shift.x + "," + shift.y + ") ");
            }
            else {//如果平移且缩放
                var newZoom = this._undef(evt.zoom) ? this.map._zoom : evt.zoom;
                this._zoomDiff = newZoom - this._zoom;
                this._scale = Math.pow(2, this._zoomDiff);
                this.projection.scale = this._scale;
                this._shift = this.map.latLngToLayerPoint(this._wgsOrigin)
                    ._subtract(this._wgsInitialShift.multiplyBy(this._scale));

                var shift = ["translate(", this._shift.x, ",", this._shift.y, ") "];
                var scale = ["scale(", this._scale, ",", this._scale, ") "];
                this._rootGroup.attr("transform", shift.concat(scale).join(""));
            }

            if (this.options.zoomDraw) { this.draw() }
            this._enableLeafletRounding();
        },

        onAdd: function (map) {
            this.map = map;
            var _layer = this;

            this._svg = L.svg();
            map.addLayer(this._svg);
            this._rootGroup = d3.select(this._svg._rootGroup).classed("d3-overlay", true);

            //如果具有交互事件，则将g设置为可交互的
            if (this.options.interactive) {
                this._svg._rootGroup.setAttribute('pointer-events', 'visiblePainted');
                L.DomUtil.addClass(this._svg._rootGroup, 'leaflet-interactive');
                this.addInteractiveTarget(this._svg._rootGroup);
            }

            this._rootGroup.classed("leaflet-zoom-hide", this.options.zoomHide);
            this.selection = this._rootGroup;

            //初始化 shift/scale 的固定属性
            this._pixelOrigin = map.getPixelOrigin();
            this._wgsOrigin = L.latLng([0, 0]);
            this._wgsInitialShift = this.map.latLngToLayerPoint(this._wgsOrigin);
            this._zoom = this.map.getZoom();
            this._shift = L.point(0, 0);
            this._scale = 1;

            //projection
            this.projection = {
                latLngToLayerPoint: function (latLng, zoom) {
                    zoom = _layer._undef(zoom) ? _layer._zoom : zoom;
                    var projectedPoint = _layer.map.project(L.latLng(latLng), zoom)._round();
                    return projectedPoint._subtract(_layer._pixelOrigin);
                },
                layerPointToLatLng: function (point, zoom) {
                    zoom = _layer._undef(zoom) ? _layer._zoom : zoom;
                    var projectedPoint = L.point(point).add(_layer._pixelOrigin);
                    return _layer.map.unproject(projectedPoint, zoom);
                },
                unitsPerMeter: 256 * Math.pow(2, _layer._zoom) / 40075017,
                map: _layer.map,
                layer: _layer,
                scale: 1
            };
            this.projection._projectPoint = function (x, y) {
                var point = _layer.projection.latLngToLayerPoint(new L.LatLng(y, x));
                this.stream.point(point.x, point.y);
            };
            this.projection.pathFromGeojson =
                d3.geoPath(d3.geoTransform({ point: this.projection._projectPoint }));

            this.projection.latLngToLayerFloatPoint = this.projection.latLngToLayerPoint;
            this.projection.getZoom = this.map.getZoom.bind(this.map);
            this.projection.getBounds = this.map.getBounds.bind(this.map);
            this.selection = this._rootGroup;

            //初始绘制
            this.draw();
        },


        getEvents: function () {
            return { "zoomend": this._zoomChange }
        },

        onRemove: function (map) {

            //如果具有交互事件，则将交互事件去除
            if (this.options.interactive) {
                this.removeInteractiveTarget(this._svg._rootGroup);

                this._childGroup = this._svg._rootGroup.childNodes;
                for (i in this._childGroup) {
                    if (this._childGroup[i].tagName == 'path') {
                        this.removeInteractiveTarget(this._childGroup[i]);
                    }
                }
            }

            this._svg.remove();

        },

        addTo: function (map) {
            map.addLayer(this);
            return this;
        }

    });

    L.d3SvgOverlay = function (drawCallback, options) {
        return new L.D3SvgOverlay(drawCallback, options);
    };

}));