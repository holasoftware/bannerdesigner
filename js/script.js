;(function($, global){
    var bannerDesigner = null;

    var _LAYER_ID = 1;


    var IMAGE_WITH_OVERLAY = 0;
    var GRADIENT = 1;

    var inherits = (function () {
        var F = function () {};

        return function (C, P) {
            if (Object.create){
                C.prototype =  Object.create( P.prototype, {
                    constructor: {
                      value: C,
                    },
                    __super__: {
                        value: P.prototype
                    }
                });
            } else {
                F.prototype = P.prototype;
                C.prototype = new F();

                C.prototype.constructor = C;
                C.prototype.__super__ = P.prototype;
            }

            C.baseConstructor = P;
        }
    }());

    function __import(obj, src){
        var own, key;
        own = {}.hasOwnProperty;
        for (key in src) {
          if (own.call(src, key)) {
            obj[key] = src[key];
          }
        }
        return obj;
    }

    var EventManager = function(){
        this._events = {};
    };


    EventManager.prototype.on	= function(event, fct){
	    this._events[event] = this._events[event]	|| [];
	    this._events[event].push(fct);
    };

	EventManager.prototype.off = function(event, fct){
	    if( !this._events.hasOwnProperty(event) )	return;

	    this._events[event].splice(this._events[event].indexOf(fct), 1);
    };

	EventManager.prototype.trigger= function(event /* , args... */){
	    if( !this._events.hasOwnProperty(event) ) return;

	    for(var i = 0; i < this._events[event].length; i++){
		    this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
	    }
    };

    var Layer = function(banner_designer, config){
        var self = this;

        config = config || {};

        this.bannerDesigner = banner_designer;

        var layerId = _LAYER_ID++;
        this.layerId = layerId;

        this.positionOrder = this.bannerDesigner.numLayers;

        this.bannerDesigner.numLayers += 1;

        var formHTML = this._getFormHTML(layerId);
        this.$layerForm = $(formHTML);

        this.bannerDesigner.$layerFormBox.append(this.$layerForm);
        this.layerName = "";

        $("#layer" + layerId + "_name").on("input propertychange", function () {
            var layerName = $(this).val().trim();

            self.layerName = layerName;
            $layerSelectOption.text("#" + layerId +  " " + layerName);
        });

        var $layerSelectOption = $("<option value='" + layerId + "'>#" + layerId + "</option>");
        this.$layerSelectOption = $layerSelectOption;

        this.bannerDesigner.$layerSelect.append($layerSelectOption);
        this.bannerDesigner.$layerSelect.val(layerId);

        var $layer = this.createLayer(layerId);
        this.$layer = $layer;

        this.bannerDesigner.$banner.append($layer);

        this.bannerDesigner.$bannerDesignerForm.prepend("<input type='hidden' id='layer" + layerId + "_type' name='layer" + layerId + "_type' value='" + this.layerType + "'>");

        var $layerTopInput = $("<input type='hidden' id='layer" + layerId + "_top' name='layer" + layerId + "_top' value='0px'>");
        this.bannerDesigner.$bannerDesignerForm.prepend($layerTopInput);
        this.$layerTopInput = $layerTopInput;

        var $layerLeftInput = $("<input type='hidden' id='layer" + layerId + "_left' name='layer" + layerId + "_left' value='0px'>");
        this.bannerDesigner.$bannerDesignerForm.prepend($layerLeftInput);
        this.$layerLeftInput = $layerLeftInput;

        $layer.draggabilly({
            grid: [ 20, 20 ]
        });

        $layer.on('dragStart', function(){
            $("#download").hide();
        });

        var eventManager = banner_designer.eventManager;

        $layer.on('dragEnd', function(){
            var $el = $(this);

            var element_name= $el.attr("id").substring(7);
            var top = $el.css("top");
            var left = $el.css("left");

            $layerTopInput.val(top);
            $layerLeftInput.val(left);

            eventManager.trigger("inputchange", {
                'type': 'layer_moved',
                'layer': self,
                'top': top,
                'left': left
            });
        });

        if (config.top !== undefined && config.left !== undefined){
            $layer.css("top", config.top);
            $layerTopInput.val(config.top);

            $layer.css("left", config.left);
            $layerLeftInput.val(config.left);
        }

        this.init(config);
        this.initOnChangeHook();
    }

    Layer.prototype.initOnChangeHook = function(){
        var self = this;

        var eventManager = this.bannerDesigner.eventManager;
        this.$layerForm.on("input propertychange", "input, select, textarea", function(){
            var input = this;
            eventManager.trigger("inputchange", {
                'type': 'input_changed_in_layer',
                'input': input,
                'layer': self
            });
        });
    }

    Layer.prototype.showForm = function(){
        this.$layerForm.show();
    }

    Layer.prototype.hideForm = function(){
        this.$layerForm.hide();
    }

    Layer.prototype.exportData = function(){
       var top = this.$layerTopInput.val();
       var left = this.$layerLeftInput.val();

        var data = {
            "layer_name": this.layerName,
            "layer_type": this.layerType,
            "top": top,
            "left": left
        };

        return data;
    }

    Layer.prototype.$getElementByName = function(suffix){
        return $("#layer" + this.layerId + "_" + suffix);
    }

    Layer.prototype.createLayer = function(layerId){
        return $("<div id='layer" + layerId + "' class='layer layer-type-" + this.layerType + "'></div>");
    }

    Layer.prototype._getFormHTML = function(layerId){
        var templateFormSrc = this.bannerDesigner.layerFormTemplates[this.layerType];
        var html = templateFormSrc.replaceAll("{layer_id}", layerId);

        return html;
    }

    Layer.prototype.init = function(){}


    Layer.prototype.delete = function(){
        this.bannerDesigner.numLayers -= 1;

        this.$layer.remove();
        this.$layerForm.remove();
        this.$layerSelectOption.remove();
    }


    var ImageLayer = function(banner_designer, config){
        this.constructor.baseConstructor.call(this, banner_designer, config);
    }

    inherits(ImageLayer, Layer);

    ImageLayer.prototype.layerType = "image";

    ImageLayer.prototype.exportData = function(){
        var data = this.__super__.exportData.call(this);

        data.width = this.$getElementByName("width").val().trim();
        data.height = this.$getElementByName("height").val().trim();
        data.image_src = this.$getElementByName("image_src").val().trim();

        return data;
    }

    ImageLayer.prototype._updateTopPositionOfLayer = function(){
        var imageHeight = this.$image.height();
        var imageTop = this.$image.css("top");
        var bannerHeight = this.bannerDesigner.$banner.height();

        if (imageTop + imageHeight > bannerHeight){
            var top = bannerHeight - imageHeight;
            $image.css("top") = top;

            this.$layerTopInput.val(top);
        }
    }

    ImageLayer.prototype._updateLeftPositionOfLayer = function(){
        var imageWidth = this.$image.width();

        var imageLeft = this.$image.css("left");
        var bannerWidth = this.bannerDesigner.$banner.width();

        if (imageLeft + imageWidth > bannerWidth){
            var left = bannerWidth - imageWidth;

            this.$image.css("left") = left;
            this.$layerLeftInput.val(left);
        }
    }

    ImageLayer.prototype.createLayer = function(layerID){
        var $layer = this.__super__.createLayer.call(this, layerID);
        var $image = $("<img />");
        this.$image = $image;

        $layer.append($image);
        return $layer;
    }

    ImageLayer.prototype._updateImageSrc = function(src){
        if (src){
            this.$layer.show();
            this.$image.attr("src", src);
            this._updateTopPositionOfLayer();
            this._updateLeftPositionOfLayer();
        } else {
            this.$layer.hide();
        }
    }

    // TODO: Se tiene que modificar height, cuando se modifica width, y viceversa?
    ImageLayer.prototype.init = function(config){
        var self = this;
        var width, height, initial_image_src;

        var $layer = this.$layer;
        var $image = this.$image;

        if (config.image_src === undefined){
            initial_image_src = null;
        } else {
            initial_image_src = config.image_src;
        }

        var $imageSrcInput = this.$getElementByName("image_src");
        if (this.bannerDesigner.useCustomImageUrlGetter){
            this.bannerDesigner.initCustomGetImageUrl($imageSrcInput, function(src){
                self._updateImageSrc(src);
            }, initial_image_src);
        } else {
            $imageSrcInput.on("input propertychange", function () {
                var src = $(this).val().trim();
                self._updateImageSrc(src);
            });

            if (initial_image_src !== null){
                $imageSrcInput.val(initial_image_src);
            }
        }

        if (initial_image_src !== null){
            if (initial_image_src){
                $layer.show();
                $image.attr("src", image_src);
            } else {
                $layer.hide();
            }
        }

        var $widthInput = this.$getElementByName("width");
        $widthInput.on("input propertychange", function () {
            var width = $(this).val();

            $image.width(width);
            self._updateLeftPositionOfLayer();
        });

        if (config.width !== undefined){
            width = config.width;

            $widthInput.val(width);
        } else {
            width = $widthInput.val().trim();
        }

        $image.width(width);

        var $heightInput = this.$getElementByName("height");
        $heightInput.on("input propertychange", function () {
            var height = $(this).val();

            $image.height(height);
            self._updateTopPositionOfLayer();
        });

        if (config.height !== undefined){
            height = config.height;

            $heightInput.val(height);
        } else {
            height = $heightInput.val().trim();
        }

        $image.height(height);
    }

    var TextLayer = function(banner_designer, config){
        this.constructor.baseConstructor.call(this, banner_designer, config);
    }
    inherits(TextLayer, Layer);

    TextLayer.prototype.layerType = "text";

    TextLayer.prototype.exportData = function(){
        var self = this;
        var data = this.__super__.exportData.call(this);

        ["width", "text", "bg_transparent", "font_size", "font_family", "text_align", "line_height", "padding", "border_width", "border_color", "border_radius", "color", "background_color"].forEach(function(inputName){
            var value = self.$getElementByName(inputName).val();
            data[inputName] = value;
        });

        data.bg_transparent = this.$getElementByName("bg_transparent").is(":checked");

        return data;
    }

    TextLayer.prototype.init = function(config){
        var self = this;
        var text, width, background_color, bg_transparent;

        var $layer = this.$layer;

        var $textInput = this.$getElementByName("text")
        $textInput.on("input propertychange", function () {
            $layer.text($(this).val());
        });

        if (config.text !== undefined ){
            text = config.text;

            $textInput.val(text);
        } else {
            text = $textInput.val();
        }

        $layer.text(text);

        var $widthInput = this.$getElementByName("width")
        $widthInput.on("input propertychange", function () {
            var width = $(this).val().trim();

            $layer.width(width);
        });

        if (config.width !== undefined ){
            width = config.width;

            $widthInput.val(width);
        } else {
            width = $widthInput.val();
        }

        $layer.width(width);

        [["font_size", "font-size", "input propertychange"], ["font_family", "font-family", "input propertychange"], ["text_align", "text-align", "input propertychange"],  ["line_height", "line-height", "input propertychange"], ["padding", "padding", "input propertychange"], ["border_width", "border-width", "input propertychange"], ["border_color", "border-color", "change"], ["border_radius", "border-radius", "input propertychange"], ["color", "color", "change"]].forEach(function(arg){
            var elementName = arg[0];
            var cssPropertyName = arg[1];
            var onEvent = arg[2];


            var $input = self.$getElementByName(elementName);

            $input.on(onEvent, function (){
                var value = $input.val();
                $layer.css(cssPropertyName, value);
            });

            if (config[elementName] !== undefined){
                var value = config[elementName];
                if (value !== ""){
                    $input.val(value);
                }  
            } else {
                var value = $input.val();   
            }

            if (value !== ""){
                $layer.css(cssPropertyName, value);
            } else {
                $layer.css(cssPropertyName, "");
                $input.val($layer.css(cssPropertyName));
            } 
        });


        var $backgroundColorInput = this.$getElementByName("background_color");

        $backgroundColorInput.on("change", function () {
            if(!$bg_transparent.is(":checked")){
                var backgroundColor = $backgroundColorInput.val();

                $layer.css("background-color", backgroundColor);
            }
        });

        var $bg_transparent = this.$getElementByName("bg_transparent");
        $bg_transparent.on("change", function () {
            if($(this).is(":checked")){
                $layer.css("background","none");
            } else {
                $layer.css("background-color", $backgroundColorInput.val());
            }
        });

        if (config.bg_transparent !== undefined ){
            bg_transparent = config.bg_transparent;

            if (bg_transparent){
                $bg_transparent.attr('checked','checked');
            } else {
                $bg_transparent.removeAttr('checked');
            }
        } else {
            bg_transparent = $bg_transparent.is(":checked");
        }

        if (config.background_color !== undefined ){
            $backgroundColorInput.val(config.background_color);
        }

        if(bg_transparent){
            $layer.css("background","none");
        } else {
            if (config.background_color !== undefined ){
                background_color = config.background_color;
            } else {
                background_color = $backgroundColorInput.val();
            }

            $layer.css("background-color", background_color);
        }
    }

    function gradientBackgroundStyle(direction, color1, color2){
        if (direction === "circle"){
            return "radial-gradient(" + color1 + "," + color2 +")";
        } else {
            return "linear-gradient(to " + direction + "," + color1 + "," + color2 +")";
        }
    }

    function BannerDesigner(options){
        options = options || {};

        var self = this;
        var layerClasses = {};

        this.layerClasses = layerClasses;
        layerClasses[TextLayer.prototype.layerType] = TextLayer;
        layerClasses[ImageLayer.prototype.layerType] = ImageLayer;

        if (options.layerClasses){
            Object.keys(options.layerClasses).forEach(function(layerType){
                self.registerLayerClass(layerType, options.layerClasses[layerType])
            });
        }

        this.$bannerDesignerForm = $("#banner-designer-form");

        this.layerFormTemplates = {
            "text": $("#text-layer-form").html(),
            "image": $("#image-layer-form").html()
        }

        this.$banner = $("#banner");
        this.$overlay = $("#banner_overlay");

        this.$layerFormHead = $("#layer-form-head");

        this.$layerIdText = $("#layer-id-text");
        this.$layerTypeText = $("#layer-type-text");
        this.$layerStackPositionNum = $("#stack-position-num");
        this.$layerFormBox = $("#layer-form-box");

        this.$moveLayerUpBtn = $("#move-layer-up-btn");
        this.$moveLayerDownBtn = $("#move-layer-down-btn")

        this.$bannerSrcInput = $("#banner_src");
        this.$bannerWidthInput = $("#banner_width");
        this.$bannerHeightInput = $("#banner_height");
        this.$bannerBgPositionInput = $("#banner_bg_position");
        this.$overlayColorInput = $("#overlay_color");
        this.$overlayOpacityInput = $("#overlay_opacity");
        this.$overlayGradientColor1Input = $("#overlay_gradient_color1");
        this.$overlayGradientColor2Input = $("#overlay_gradient_color2");

        this.$layerSelect = $("#layer-select");

        this.backgroundType = null;
        this.currentLayerId = null;
        this.layersById = {};
        this.layerOrderList = [];
        this.numLayers = 0;

        this.eventManager = new EventManager();

        this.onChange = options.onChange || null;
        this.onGetImageUrl = options.onGetImageUrl || null;
        this.useCustomImageUrlGetter = this.onGetImageUrl !== null;

        var self = this;
        if (this.onChange){
            this.eventManager.on("inputchange", function(){
                self.onChange.apply(self, Array.prototype.slice.call(arguments));
            });
        }

        this._width = null;
        this._height = null;
        this._naturalWidth = null;
        this._naturalHeight = null;

        this.initInputs();
    }

    BannerDesigner.prototype.initInputs = function(){
        var self = this;

        this.$layerSelect.change(function(e){
            var layerId = parseInt(self.$layerSelect.val());

            if (self.currentLayerId !== null){
                self.layersById[self.currentLayerId].hideForm();
            }

            if (layerId === ""){
                self.currentLayerId = null;
                self.$layerFormHead.hide();
            } else {
                self.currentLayerId = layerId;

                var layer = self.layersById[layerId];
                self.$layerStackPositionNum.val(layer.positionOrder+1);
                self.$layerIdText.text(layerId);
                self.$layerTypeText.text(layer.layerType);
                self.$layerFormHead.show();

                self.layersById[layerId].showForm();

                self.$moveLayerUpBtn.attr("disabled", "disabled");

                if (layer.positionOrder === 0) {
                    self.$moveLayerDownBtn.attr("disabled", "disabled");
                } else {
                    self.$moveLayerDownBtn.removeAttr("disabled")
                }

                if (layer.positionOrder === self.numLayers - 1) {
                    self.$moveLayerUpBtn.attr("disabled", "disabled");
                } else {
                    self.$moveLayerUpBtn.removeAttr("disabled")
                }
            }
        });

        $("#add_text_layer_btn").click(function(e){
            e.preventDefault();
            self.addLayer("text");
        });

        $("#add_image_layer_btn").click(function(e){
            e.preventDefault();
            self.addLayer("image");
        });

        $("#remove_layer").click(function(e){
            e.preventDefault();
            if (self.currentLayerId !== null){
                self.removeLayer(self.currentLayerId);
            }
        });

        $('#create_image').click(function (e) {
            e.preventDefault();

            // var s = $(window).scrollTop();

            var $createImage = $(this);

            var createText = $createImage.text();
            $(this).text("Preparing image..");
            
            var opts = {
                allowTaint : true,
                scale: 1
                //type: 'view'
            }

            if (this._width !== null && this._height !== null) {
                opts.width = self._width;
                opts.height = self._height;
            }

            html2canvas(self.$banner[0], opts).then(function(canvas){
                 $createImage.text(createText);
    
                // "image/png"
                 $("#download").attr("href", canvas.toDataURL("image/jpeg", 1.0));
                // $(window).scrollTop(s);
                $("#download").show();
            });

        });


        $("#export").click(function(e){
            // var data= $("#banner-designer-form").serializeArray();

            var data = self.exportBanner();
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 4));
            
            this.setAttribute("href", dataStr);
        });


        $("#import").click(function(e){
            e.preventDefault();

            $importInput = $("input[name=import]");

            $importInput.trigger('click');
            $importInput.change(function() {
                var file = $importInput.get(0).files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.readAsText(file);
                    reader.onload = function(e) {
                        var rawData = e.target.result;

                        var data;
                        try {
                            data = JSON.parse(rawData);
                        } catch(e){
                            alert("Data not in correct format");
                            return;
                        }

                        self.importBanner(data);
                    };
                }

            });
        });

        //update();

        this.$bannerWidthInput.on("input propertychange", function () {
            var widthValue = $(this).val().trim();

            if (widthValue){
                widthValue = parseInt(widthValue);
                if (isNaN(widthValue)) return;

                self._width = widthValue;
                self.$banner.width(widthValue + "px");

                if (self._height === null && (self._naturalWidth !== null && self._naturalHeight !== null)){
                    var height = Math.round((widthValue * self._naturalHeight ) / self._naturalWidth);
                    self.$banner.height(height + "px");
                }
            } else {
                self._width = null;
                if (self._height !== null && (self._naturalWidth !== null && self._naturalHeight !== null)){
                    var width = Math.round((self._height * self._naturalWidth ) / self._naturalHeight);
                    self.$banner.width(width + "px");
                } else {
                    self.$banner.width("");
                }

            }
        });

        var width = parseInt(this.$bannerWidthInput.val().trim());
        if (!isNaN(width)){
            this._width = width;
            this.$banner.width(width +"px");
        }

        this.$bannerHeightInput.on("input propertychange", function () {
            var heightValue = $(this).val().trim();

            if (heightValue){
                heightValue = parseInt(heightValue);
                if (isNaN(heightValue)) return;

                self._height = heightValue;
                self.$banner.height(heightValue + "px");

                if (self._width === null && (self._naturalWidth !== null && self._naturalHeight !== null)){
                    var width = Math.round((heightValue * self._naturalWidth ) / self._naturalHeight);
                    self.$banner.width(width + "px");
                }
            } else {
                self._height = null;
                if (self._width !== null && (self._naturalWidth !== null && self._naturalHeight !== null)){
                    var height = Math.round((self._width * self._naturalHeight ) / self._naturalWidth);
                    self.$banner.height(height + "px");
                } else {
                    self.$banner.height("");
                }
            }
        });

        var height = parseInt(this.$bannerHeightInput.val().trim());
        if (!isNaN(height)){
            this._height = height;
            this.$banner.height(height + "px");
        }

        if (this.useCustomImageUrlGetter){
            this.$bannerSrcInput = this.initCustomGetImageUrl(this.$bannerSrcInput, function(src){
                self.setBannerSrc(src);
            });
        } else {
            this.$bannerSrcInput.on("input propertychange", function () {
                self.setBannerSrc($(this).val().trim());
            });
        }
        this.setBannerSrc(this.$bannerSrcInput.val().trim());

        this.$bannerBgPositionInput.on("change", function () {
            var background_position = $(this).val();
            self.$banner.css("background-position", background_position);
        });

        var background_position = this.$bannerBgPositionInput.val();
        if (background_position){
            this.$banner.css("background-position", background_position);
        }

        $("input[name=background_type]").on("input propertychange", function () {
            self.updateBannerBackground();
        });

        this.$overlayColorInput.on("input propertychange", function () {
            if (self.backgroundType !== IMAGE_WITH_OVERLAY) return;

            var overlayColor = $(this).val().trim() || "transparent";
            $("#banner_overlay").css("background-color", overlayColor);
        });

        this.$overlayOpacityInput.on("input propertychange", function () {
            if (self.backgroundType !== IMAGE_WITH_OVERLAY) return;

            var opacity = $(this).val().trim() || "1";
            $("#banner_overlay").css("opacity", opacity);
        });

        this.$overlayGradientColor1Input.on("input propertychange", function () {
            if (self.backgroundType !== GRADIENT) return;
            self.initializeOrUpdateGradientBackground();
        });

        this.$overlayGradientColor2Input.on("input propertychange", function () {
            if (self.backgroundType !== GRADIENT) return;
            self.initializeOrUpdateGradientBackground();
        });

        $("input[name=overlay_gradient_direction]").on("input propertychange", function () {
            if (self.backgroundType !== GRADIENT) return;
            self.initializeOrUpdateGradientBackground();
        });


        this.$moveLayerUpBtn.click(function(e){
            e.preventDefault()

            var currentLayer = self.layersById[self.currentLayerId];
            if (currentLayer.positionOrder === self.numLayers-1) return;
            
            var nextLayerId = self.layerOrderList[currentLayer.positionOrder+1];
            var nextLayer = self.layersById[nextLayerId];

            currentLayer.$layer.insertAfter(nextLayer.$layer);
            currentLayer.$layerSelectOption.insertAfter(nextLayer.$layerSelectOption);

            swap_position_order(currentLayer, nextLayer)

            self.$layerStackPositionNum.text(currentLayer.positionOrder+1);
            if (currentLayer.positionOrder === self.numLayers-1) self.$moveLayerUpBtn.attr("disabled", "disabled");
            if (self.$moveLayerDownBtn.attr("disabled") !== null) self.$moveLayerDownBtn.removeAttr("disabled");

            self.eventManager.trigger("inputchange", {
                'type': 'move_layer_up',
                'layer': self
            });
        });

        this.$moveLayerDownBtn.click(function(e){
            e.preventDefault();

            var currentLayer = self.layersById[self.currentLayerId];
            if (currentLayer.positionOrder === 0) return;
            
            var previousLayerId = self.layerOrderList[currentLayer.positionOrder - 1];
            var previousLayer = self.layersById[previousLayerId];

            currentLayer.$layer.insertBefore(previousLayer.$layer);
            currentLayer.$layerSelectOption.insertBefore(previousLayer.$layerSelectOption);

            swap_position_order(currentLayer, previousLayer)

            self.$layerStackPositionNum.text(currentLayer.positionOrder+1);

            if (currentLayer.positionOrder === 0) self.$moveLayerDownBtn.attr("disabled", "disabled");
            if (self.$moveLayerUpBtn.attr("disabled") !== null) self.$moveLayerUpBtn.removeAttr("disabled");

            self.eventManager.trigger("inputchange", {
                'type': 'move_layer_down',
                'layer': self
            });
        });

        function swap_position_order(layer1, layer2){
            var layer1PositionOrder = layer1.positionOrder;

            layer1.positionOrder = layer2.positionOrder;
            layer2.positionOrder = layer1PositionOrder;

            self.layerOrderList[layer1.positionOrder] = layer1.layerId;
            self.layerOrderList[layer2.positionOrder] = layer2.layerId;
        }


        $("#banner-designer-form-right-side").on("input propertychange", "input, select, textarea", function(){
            var input = this;

            self.eventManager.trigger("inputchange", {
                'type': 'form_right_side_input_change',
                'input': input
            });
        });

        self.eventManager.on("inputchange", function(){
            $("#download").hide();
        });

        self.updateBannerBackground();
    };

    BannerDesigner.prototype.initCustomGetImageUrl = function($input, cb, initial_src){
        var self = this;
        var input = $input.get(0);

        var NO_IMAGE_SELECTED_TEXT = "No image selected";

        var inputName = $input.attr("name");
        var inputId = $input.attr("id");

        var $imageSrcWidget = $("<div class='image-src-widget'></div>");
        var $imageSrcHiddenInput = $("<input type='hidden' id='" + inputId + "' name='" + inputName + "'/>");

        var reset = function(){
            $imageSrcText.text(NO_IMAGE_SELECTED_TEXT);
            $imageSrcText.addClass("no-src-input");
            $imageSrcHiddenInput.val("");

            $resetButton.hide();

            cb("");
        }

        $imageSrcHiddenInput.on("init", function () {
            var src = $(this).val().trim();
            if (src){
                $imageSrcText.text(src);
                $imageSrcText.removeClass("no-src-input");
                $resetButton.show();
            } else {
                $imageSrcText.text(NO_IMAGE_SELECTED_TEXT);
                $imageSrcText.addClass("no-src-input");
                $resetButton.hide();    
            }
            cb(src);
        });

        $imageSrcHiddenInput.on("reset", function () {
            reset();
        });

        var $imageSrcText = $("<span class='image-src-text'></span>");

        if (initial_src === undefined || initial_src === null){
            initial_src = $input.val();
        }

        var $buttonsContainer = $("<div class='image-src-input-buttons' style='display: inline-block'></div>");

        var $selectImageButton = $("<button type='button' class='btn btn-default'>Select image</button>");
        var $resetButton = $("<button type='button' class='btn btn-default'>Reset</button>");

        $buttonsContainer.append($selectImageButton);
        $buttonsContainer.append($resetButton);

        $imageSrcWidget.append($imageSrcHiddenInput);
        $imageSrcWidget.append($imageSrcText);
        $imageSrcWidget.append($buttonsContainer);

        $selectImageButton.click(function(){
            self.onGetImageUrl(function(src){
                $imageSrcText.text(src);
                $imageSrcText.removeClass("no-src-input");
                $imageSrcHiddenInput.val(src);
                $resetButton.show();

                self.eventManager.trigger("inputchange", {
                    'input': input,
                    'type': 'selected_image_custom_image_url_getter'
                });

                cb(src);
            });
        });

        $resetButton.click(function(){
            self.eventManager.trigger("inputchange", {
                'input': input,
                'type': 'reset_custom_image_url_getter'
            });

            reset();
        });

        if (initial_src){
            $imageSrcText.text(text);
            $imageSrcHiddenInput.val(initial_src);
            $resetButton.show();
        } else {
            $imageSrcText.text(NO_IMAGE_SELECTED_TEXT);
            $imageSrcText.addClass("no-src-input");
            $resetButton.hide();
        }

        $input.replaceWith($imageSrcWidget);

        return $imageSrcHiddenInput;
    }

    BannerDesigner.prototype.setBannerSrc = function(imageurl){
        var self = this;

        if (imageurl === "") {
            this.$banner.css("background-image", "");
            return;
        }

        this.$banner.css("background-image", "url(" + imageurl + ")");

        if (this._width === null || this._height === null){
            var img = document.createElement("img");	
            img.onload = function() {
                self._naturalWidth = this.width;
                self._naturalHeight = this.height;

                if (self._width === null && self._height === null){
                    self._width = this.width;
                    self._height = this.height;

                    self.$banner.height(self._height);
                    self.$bannerHeightInput.val(self._height);
                    self.$banner.width(self._width);
                    self.$bannerWidthInput.val(self._width);
                } else if (self._width === null){
                    self._width = Math.round( (self._height * this.width) /  this.height);
                    self.$banner.width(self._width);
                    self.$bannerWidthInput.val(self._width);
                } else if (self._height === null){
                    self._height = Math.round( (self._width * this.height) /  this.width);
                    self.$banner.height(self._height);
                    self.$bannerHeightInput.val(self._height);
                }
            }
            img.onerror = function() {
                self._naturalWidth = null;
                self._naturalHeight = null;
            }     
            img.src = imageurl; 
        }
    }

    BannerDesigner.prototype.reset = function(){
        this.layersById = {};
        this.layerOrderList = [];
        this.$layerFormBox.empty();
        this._width = null;
        this._height = null;
        this._naturalWidth = null;
        this._naturalHeight = null;

        this.$layerFormHead.hide();

        $('#banner-designer-form :checkbox').each(function(){
            $(this).prop('checked', false);
        });

        this.$banner.width("");
        this.$banner.height("");

        if (this.useCustomImageUrlGetter){
            this.$bannerSrcInput.trigger("reset");
        } else {
            this.$bannerSrcInput.val("");
        }

        this.$banner.css("background-image", "");
        this.$banner.find(".layer").remove();

        this.$bannerWidthInput.val("");
        this.$bannerHeightInput.val("");
    }

    BannerDesigner.prototype.addLayer = function(layerType){
        if (this.currentLayerId !== null) {
            this.layersById[this.currentLayerId].hideForm();
        }

        var layer = new this.layerClasses[layerType](this);
        this.$layerFormHead.show();

        this.$layerStackPositionNum.text(layer.positionOrder+1);
        this.layersById[layer.layerId] = layer;
        this.layerOrderList.push(layer.layerId);

        this.$layerIdText.text(layer.layerId);
        this.$layerTypeText.text(layer.layerType);

        this.currentLayerId = layer.layerId;

        this.$moveLayerUpBtn.attr("disabled", "disabled");

        if (this.numLayers === 1) {
            this.$moveLayerDownBtn.attr("disabled", "disabled");
        } else {
            this.$moveLayerDownBtn.removeAttr("disabled");
        }

        this.eventManager.trigger("inputchange", {
            'type': 'added_layer',
            'layer': layer
        });

        return layer;
    }

    BannerDesigner.prototype.removeLayer = function(layerId){
        if (layerId === this.currentLayerId){
            this.$layerFormHead.hide();

            this.currentLayerId = null;
            this.$layerSelect.val("");
        }

        var layer = this.layersById[layerId];
        layer.delete();

        this.layerOrderList.splice(layer.positionOrder, 1);

        for (var i=layer.positionOrder; i < this.numLayers; i++){
            this.layersById[layerOrderList[i]].positionOrder -= 1;
        }

        delete this.layersById[layerId];

        this.eventManager.trigger("inputchange", {
            'type': 'removed_layer',
            'layer': layer
        });
    }

    BannerDesigner.prototype.updateBannerBackground = function(){
        var backgroundTypeValue = $("input[name=background_type]:checked").val();

        if (backgroundTypeValue === "image_with_overlay"){
            this.initializeOrUpdateImageOverlayBackground()
        } else if (backgroundTypeValue === "gradient") {
            this.initializeOrUpdateGradientBackground();
        }

        return backgroundTypeValue;
    }

    BannerDesigner.prototype.createImageOverlayBackground = function(imageurl, overlayColor, opacity){
        this.backgroundType = IMAGE_WITH_OVERLAY;

        if (imageurl){
            this.$banner.css("background-image", "url(" + imageurl + ")");
        }

        this.$overlay.css("background-color", overlayColor);
        this.$overlay.css("opacity", opacity);
    }

    BannerDesigner.prototype.initializeOrUpdateImageOverlayBackground = function(){
        var imageurl = this.$bannerSrcInput.val().trim();
        var overlayColor = this.$overlayColorInput.val().trim();
        var opacity = this.$overlayOpacityInput.val().trim();

        this.createImageOverlayBackground(imageurl, overlayColor, opacity);
    }

    BannerDesigner.prototype.createGradientBackground = function(color1, color2, direction){
        this.backgroundType = GRADIENT;

        var background = gradientBackgroundStyle(direction, color1, color2);

        this.$banner.css("background-image", background);
        $("#banner_overlay").css("opacity", 0);
    }

    BannerDesigner.prototype.initializeOrUpdateGradientBackground = function(){
        var color1 = this.$overlayGradientColor1Input.val();
        var color2 = this.$overlayGradientColor2Input.val();

        var direction = $("input[name=overlay_gradient_direction]:checked").val();

        this.createGradientBackground(color1, color2, direction);
    }

    BannerDesigner.prototype.importBanner = function(data){
        //$("#banner-designer-form").deserialize(data);
        var self = this;

        this.reset();

        if (data.banner_width){
            this.$bannerWidthInput.val(data.banner_width);

            this.$banner.width(data.banner_width +"px");
            this._width = data.banner_width;
        }

        if (data.banner_height){
            this.$bannerHeightInput.val(data.banner_height);

            this.$banner.height(data.banner_height +"px");
            this._height = data.banner_height;
        }

        if (data.banner_src){
            this.$bannerSrcInput.val(data.banner_src);

            if (this.useCustomImageUrlGetter){
                this.$bannerSrcInput.trigger("init");
            } else {
                this.setBannerSrc(data.banner_src);
            }
        }

        this.$bannerBgPositionInput.val(data.banner_bg_position);
        this.$overlayColorInput.val(data.overlay_color);
        this.$overlayOpacityInput.val(data.overlay_opacity);
        this.$overlayGradientColor1Input.val(data.overlay_gradient_color1);
        this.$overlayGradientColor2Input.val(data.overlay_gradient_color2);

        $("#banner-designer-form input[name=overlay_gradient_direction][value='" + data.overlay_gradient_direction + "']").prop("checked", true);
        $("#banner-designer-form input[name=background_type][value='" + data.background_type + "']").prop("checked", true);

        if (data.background_type === "image_with_overlay"){
            this.createImageOverlayBackground(data.banner_src, data.overlay_color, data.overlay_opacity);
        } else if (data.background_type === "gradient") {
            this.createGradientBackground(data.overlay_gradient_color1, data.overlay_gradient_color2, data.overlay_gradient_direction);
        }

        if (data.layers){
            data.layers.forEach(function(layerConfig){
                var layerClass = self.layerClasses[layerConfig.layer_type];
                var layer = new layerClass(self, layerConfig);
                layer.hideForm();

                self.layersById[layer.layerId] = layer;
                self.layerOrderList.push(layer.layerId);
            });
        }

        this.$layerSelect.val("");
    }

    BannerDesigner.prototype.exportBanner = function(){
        var self = this;

        var banner_width = $("#banner_width").val();
        var banner_height = $("#banner_height").val();

        var background_type = $("#banner-designer-form input[name=background_type]:checked").val();
        var banner_src = $("#banner_src").val();
        var banner_bg_position = $("#banner_bg_position").val();
        var overlay_color = $("#overlay_color").val();
        var overlay_opacity = $("#overlay_opacity").val();
        var overlay_gradient_color1 = $("#overlay_gradient_color1").val();
        var overlay_gradient_color2 = $("#overlay_gradient_color2").val();
        var overlay_gradient_direction = $("input[name=overlay_gradient_direction]").val();

        var layers = this.layerOrderList.map(function(layerId){
            return self.layersById[layerId].exportData();
        });

        var data = {
            banner_width: banner_width,
            banner_height: banner_height,
            background_type: background_type,
            banner_src: banner_src,
            banner_bg_position: banner_bg_position,
            overlay_color: overlay_color,
            overlay_opacity: overlay_opacity,
            overlay_gradient_color1: overlay_gradient_color1,
            overlay_gradient_color2: overlay_gradient_color2,
            overlay_gradient_direction: overlay_gradient_direction,
            layers: layers
        }

        return data;
    }

    BannerDesigner.prototype.registerLayerClass = function(layerType, layerMethods){
        var layerClass = function(banner_designer, config){
            this.constructor.baseConstructor.call(this, banner_designer, config);
        }

        __import(layerClass, layerMethods);

        layerClass.prototype.layerType = layerType;

        inherits(layerClass, Layer);
        
        this.layerClasses[layerType] = layerClass;
    }

    BannerDesigner.getOrInit = function(options){
        if (bannerDesigner !== null) return bannerDesigner;
        return BannerDesigner.init(options);
    }

    BannerDesigner.init = function(options){
        if (bannerDesigner !== null) throw "Banner designer already initialized";
        bannerDesigner = new BannerDesigner(options);
        return bannerDesigner;
    }

    global.BannerDesigner = BannerDesigner;
})(jQuery, this);
