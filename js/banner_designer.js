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

    var Layer = function(){
        this.layerId = _LAYER_ID++;
    }

    Layer.prototype.init = function(banner_designer, config){
        var self = this;

        if (config === null || config === undefined){
            config = $.extend({}, this.defaultValues);
        } else {
            if (this.defaultValues === null){
                config = {};
            } else {
                config = $.extend({}, this.defaultValues, config);
            }
        }

        var layerId = this.layerId;

        banner_designer.$bannerDesignerForm.prepend("<input type='hidden' id='layer" + layerId + "_type' name='layer" + layerId + "_type' value='" + this.layerType + "'>");

        var $layerTopInput = $("<input type='hidden' id='layer" + layerId + "_top' name='layer" + layerId + "_top' value='0px'>");
        banner_designer.$bannerDesignerForm.prepend($layerTopInput);

        var $layerLeftInput = $("<input type='hidden' id='layer" + layerId + "_left' name='layer" + layerId + "_left' value='0px'>");
        banner_designer.$bannerDesignerForm.prepend($layerLeftInput);

        if (config.top !== undefined && config.left !== undefined){
            $layerTopInput.val(config.top);
            $layerLeftInput.val(config.left);
        }

        var eventManager = banner_designer.eventManager;

        var $layer = this.appendLayerInBanner(banner_designer.$banner, config);

        $layer.draggabilly({
            grid: [ 20, 20 ]
        });

        $layer.on('click', function(){
            if (banner_designer.setCurrentLayerOnclick)
                banner_designer.setCurrentLayer(layerId);
        });

        $layer.on('dragStart', function(){
            banner_designer.$downloadBannerLink.hide();
            banner_designer.$layerDraggedContainer.css("visibility", "visible");

            var fullLayerName = self.getFullLayerName();
            banner_designer.$layerDraggedFullNameText.text(fullLayerName);
        });

        $layer.on('dragEnd', function(){
            banner_designer.$layerDraggedContainer.css("visibility", "hidden");

            var $el = $(this);

            var element_name= $el.attr("id").substring(7);
            var top = $el.css("top");
            var left = $el.css("left");

            $layerTopInput.val(top);
            $layerLeftInput.val(left);

            eventManager.trigger("inputchange", {
                'type': 'layer_dragged',
                'layer_id': layerId,
                'top': top,
                'left': left
            });
        });

        this.bannerDesigner = banner_designer;

        var positionOrder = banner_designer.numLayers;
        banner_designer.numLayers += 1;

        var $layerForm = this.createForm();

        this.initForm($layerForm, $layer, config);
        this.initOnChangeHook($layerForm);

        banner_designer.$layerFormBox.append($layerForm);

        this.positionOrder = positionOrder;
        this.layerName = config.layer_name !== undefined ? config.layer_name: "";
        this.$layerForm = $layerForm;
        this.$layer = $layer;
        this.$layerSelectOption = $layerSelectOption;
        this.$layerTopInput = $layerTopInput;
        this.$layerLeftInput = $layerLeftInput;

        $layerForm.$layerNameInput.on("input propertychange", function () {
            var layerName = $(this).val().trim();

            self.layerName = layerName;
            $layerSelectOption.text("#" + layerId +  " " + layerName);
        });

        var $layerSelectOption = $("<option value='" + layerId + "'>" + this.getFullLayerName() + "</option>");

        $layerSelectOption.insertAfter(banner_designer.$layerSelect.get(0).childNodes[0])
        banner_designer.$layerSelect.val(layerId);
    }

    Layer.prototype.fieldNames = null;
    Layer.prototype.defaultValues = null;

    Layer.prototype.getFullLayerName = function(){
        var fullLayerName = "#" + this.layerId;

        if (this.layerName)
            fullLayerName += " " + this.layerName;

        return fullLayerName;
    }

    Layer.prototype.fixTopPositionOutsideBorders = function(){
        var $layer = this.$layer;

        var layerHeight = $layer.height();
        var layerTop = parseInt($layer.css("top"));
        var bannerHeight = this.bannerDesigner.$banner.height();

        console.log(layerTop, bannerHeight, layerHeight);

        if (layerTop > bannerHeight){
            var top = Math.max(bannerHeight - layerHeight, 0);
            $layer.css("top", top);

            this.$layerTopInput.val(top);
        }
    }

    Layer.prototype.fixLeftPositionOutsideBorders = function(){
        var $layer = this.$layer;

        var layerWidth = $layer.width();

        var layerLeft = parseInt($layer.css("left"));
        var bannerWidth = this.bannerDesigner.$banner.width();

        if (layerLeft > bannerWidth){
            var left = Math.max(bannerWidth - layerWidth, 0);

            $layer.css("left", left);
            this.$layerLeftInput.val(left);
        }
    }

    Layer.prototype.fixPositionOutsideBorders = function(){
        this.fixTopPositionOutsideBorders();
        this.fixLeftPositionOutsideBorders();
    }

    Layer.prototype.appendLayerInBanner = function($banner, config){
        var $layer = this.createLayer(config);
        $banner.append($layer);

        return $layer;
    }

    Layer.prototype.initOnChangeHook = function($layerForm){
        var self = this;

        var eventManager = this.bannerDesigner.eventManager;

        $layerForm.on("input propertychange", "input, select, textarea", function(){
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

    Layer.prototype.getElementId = function(name){
        return "#layer" + this.layerId + "_" + name;
    }

    Layer.prototype.createLayer = function(config){
        var $layer = $("<div id='layer" + this.layerId + "' class='layer layer-type-" + this.layerType + "' data-layer-id='" + this.layerId + "'></div>");
        if (config.top !== undefined && config.left !== undefined){
            $layer.css("top", config.top);
            $layer.css("left", config.left);
        }

        return $layer;
    }

    Layer.prototype._getFormHTML = function(){
        var templateFormSrc = this.bannerDesigner.layerFormTemplates[this.layerType];
        var html = templateFormSrc.replaceAll("{layer_id}", this.layerId);

        return html;
    }

    Layer.prototype.createForm = function(){
        var self = this;

        var formHTML = this._getFormHTML(this.bannerDesigner);
        var $layerForm = $(formHTML);

        if (this.fieldNames !== null){
            this.fieldNames.forEach(function(fieldName){
                $layerForm["$" + fieldName + "_input"] = $layerForm.find(self.getElementId(fieldName));
            });
        }
        return $layerForm;
    }

    Layer.prototype.initForm = function($layerForm, $layer, config){
        $layerForm.$layerNameInput = $layerForm.find("#layer" + this.layerId + "_name");

        if (config.layer_name !== undefined){
            $layerForm.$layerNameInput.val(config.layer_name);
        }
    }

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
    ImageLayer.prototype.fieldNames = ["width", "height", "image_src"];

    ImageLayer.prototype.exportData = function(){
        var data = this.__super__.exportData.call(this);

        var $layerForm = this.$layerForm;

        data.width = $layerForm.$width_input.val().trim();
        data.height = $layerForm.$height_input.val().trim();
        data.image_src = $layerForm.$image_src_input.val().trim();

        return data;
    }

    ImageLayer.prototype.createLayer = function(config){
        var $layer = this.__super__.createLayer.call(this, config);
        var $image = $("<img />");
        $layer.$image = $image;

        if (config.height !== undefined){
            $image.height(config.height);
        }

        if (config.width !== undefined){
            $image.width(config.width);
        }

        if (config.image_src === undefined){
            $layer.hide();
        } else {
            $layer.show();
            $image.attr("src", image_src);
        }

        $layer.append($image);
        return $layer;
    }

    ImageLayer.prototype._updateImageSrc = function(src){
        if (src){
            this.$layer.show();
            this.$layer.$image.attr("src", src);
            this.fixTopPositionOutsideBorders();
            this.fixLeftPositionOutsideBorders();
        } else {
            this.$layer.hide();
        }
    }

    // TODO: Se tiene que modificar height, cuando se modifica width, y viceversa?
    ImageLayer.prototype.initForm = function($layerForm, $layer, config){
        var self = this;
        var initial_image_src;
        var $image = $layer.$image;

        if (config.image_src === undefined){
            initial_image_src = null;
        } else {
            initial_image_src = config.image_src;
        }

        if (this.bannerDesigner.useCustomImageUrlGetter){
            this.bannerDesigner.initCustomGetImageUrl($layerForm.$image_src_input, function(src){
                self._updateImageSrc(src);
            }, initial_image_src);
        } else {
            $layerForm.$image_src_input.on("input propertychange", function () {
                var src = $(this).val().trim();
                self._updateImageSrc(src);
            });

            if (initial_image_src !== null){
                $layerForm.$image_src_input.val(initial_image_src);
            }
        }

        $layerForm.$width_input.on("input propertychange", function () {
            var width = $(this).val();

            $image.width(width);
            self.fixLeftPositionOutsideBorders();
        });

        if (config.width !== undefined){
            $layerForm.$width_input.val(config.width);
        }

        $layerForm.$height_input.on("input propertychange", function () {
            var height = $(this).val();

            $image.height(height);
            self.fixTopPositionOutsideBorders();
        });

        if (config.height !== undefined){
            $layerForm.$height_input.val(config.height);
        }

        this.__super__.initForm.call(this, $layerForm, $layer, config);
    }

    var TextLayer = function(banner_designer, config){
        this.constructor.baseConstructor.call(this, banner_designer, config);
    }
    inherits(TextLayer, Layer);

    TextLayer.prototype.layerType = "text";
    TextLayer.prototype.fieldNames = ["text", "width", "text_align", "line_height", "padding", "border_width", "border_color", "border_radius", "color", "background_color", "bg_transparent", "font_size", "font_family"];

    TextLayer.prototype.defaultValues = {
        "text": "Your text...",
        "color": "#ffffff",
        "font_size": "60px",
        "font_family": "Open Sans",
        "line_height": "70px",
    };

    TextLayer.prototype.exportData = function(){
        var self = this;
        var data = this.__super__.exportData.call(this);

        var $layerForm = this.$layerForm;

        data.text = $layerForm.$text_input.val();
        data.width = $layerForm.$width_input.val();
        data.text_align = $layerForm.$text_align_input.val();
        data.line_height = $layerForm.$line_height_input.val();
        data.padding = $layerForm.$padding_input.val();
        data.border_width = $layerForm.$border_width_input.val();
        data.border_color = $layerForm.$border_color_input.val();
        data.border_radius = $layerForm.$border_radius_input.val();
        data.color = $layerForm.$color_input.val();
        data.font_size = $layerForm.$font_size_input.val();
        data.font_family = $layerForm.$font_family_input.val();
        data.background_color = $layerForm.$background_color_input.val();
        data.bg_transparent = $layerForm.$bg_transparent_input.is(":checked");

        return data;
    }

    TextLayer.prototype.createLayer = function(config){
        var $layer = this.__super__.createLayer.call(this, config);

        if (config.text !== undefined ){
            $layer.text(config.text);
        }

        if (config.width !== undefined ){
            $layer.width(config.width);
        }

        if (config.font_size !== undefined ){
            $layer.css("font-size", config.font_size);
        }

        if (config.font_family !== undefined ){
            $layer.css("font-family", config.font_family);
        }

        if (config.text_align !== undefined ){
            $layer.css("text-align", config.text_align);
        }

        if (config.line_height !== undefined ){
            $layer.css("line-height", config.line_height);
        }

        if (config.padding !== undefined ){
            $layer.css("padding", config.padding);
        }

        if (config.border_width !== undefined ){
            $layer.css("border-width", config.border_width);
        }

        if (config.border_color !== undefined ){
            $layer.css("border-color", config.border_color);
        }
        if (config.border_radius !== undefined ){
            $layer.css("border-radius", config.border_radius);
        }
        if (config.color !== undefined ){
            $layer.css("color", config.color);
        }

        var bg_transparent;
        if (config.bg_transparent !== undefined ){
            bg_transparent = config.bg_transparent;
        } else {
            bg_transparent = false;
        }

        if(bg_transparent){
            $layer.css("background", "none");
        } else {
            if (config.background_color !== undefined ){
                $layer.css("background-color", config.background_color);
            }
        }
        return $layer;
    }

    TextLayer.prototype.initForm = function($layerForm, $layer, config){
        var self = this;
        var text, width, background_color, bg_transparent;

        $layerForm.$text_input.on("input propertychange", function () {
            $layer.text($(this).val());
        });

        if (config.text !== undefined ){
            $layerForm.$text_input.val(config.text);
        }

        $layerForm.$width_input.on("input propertychange", function () {
            var width = $(this).val().trim();

            $layer.width(width);
        });

        if (config.width !== undefined ){
            $layerForm.$width_input.val(config.width);
        }

        [["font_size", "font-size", "input propertychange"], ["font_family", "font-family", "input propertychange"], ["text_align", "text-align", "input propertychange"],  ["line_height", "line-height", "input propertychange"], ["padding", "padding", "input propertychange"], ["border_width", "border-width", "input propertychange"], ["border_color", "border-color", "change"], ["border_radius", "border-radius", "input propertychange"], ["color", "color", "change"]].forEach(function(arg){
            var elementName = arg[0];
            var cssPropertyName = arg[1];
            var onEvent = arg[2];


            var $input = $layerForm["$" + elementName + "_input"];

            $input.on(onEvent, function (){
                var value = $input.val();
                $layer.css(cssPropertyName, value);
            });

            if (config[elementName] !== undefined){
                var value = config[elementName];
                if (value !== ""){
                    $input.val(value);
                }  
            }
        });


        var $background_color_input = $layerForm.$background_color_input;

        $background_color_input.on("change", function () {
            if(!$bg_transparent_input.is(":checked")){
                var backgroundColor = $background_color_input.val();

                $layer.css("background-color", backgroundColor);
            }
        });

        var $bg_transparent_input = $layerForm.$bg_transparent_input;
        $bg_transparent_input.on("change", function () {
            if($(this).is(":checked")){
                $layer.css("background","none");
            } else {
                $layer.css("background-color", $background_color_input.val());
            }
        });

        if (config.bg_transparent !== undefined ){
            bg_transparent = config.bg_transparent;

            if (bg_transparent){
                $bg_transparent_input.get(0).checked = true;
            } else {
                $bg_transparent_input.get(0).checked = false;
            }
        } else {
            bg_transparent = $bg_transparent_input.is(":checked");
        }

        if (config.background_color !== undefined ){
            $background_color_input.val(config.background_color);
        }

        if(bg_transparent){
            $layer.css("background","none");
        } else {
            if (config.background_color !== undefined ){
                background_color = config.background_color;
            } else {
                background_color = $background_color_input.val();
            }

            $layer.css("background-color", background_color);
        }

        this.__super__.initForm.call(this, $layerForm, $layer, config);
    }

    function gradientBackgroundStyle(direction, color1, color2){
        if (direction === "circle"){
            return "radial-gradient(" + color1 + "," + color2 +")";
        } else {
            return "linear-gradient(to " + direction + "," + color1 + "," + color2 +")";
        }
    }


    function BannerDesigner(options){
        if (options === undefined || options === null){
            options = $.extend({}, BannerDesigner.defaultValues);
        } else {
            options = $.extend({}, BannerDesigner.defaultValues, options);
        }

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

        this.$bannerDesignerForm = $("#banner_designer_form");

        this.layerFormTemplates = {
            "text": $("#text_layer_form").html(),
            "image": $("#image_layer_form").html()
        }

        this.$banner = $("#banner");
        this.$overlay = $("#banner_overlay");

        this.$layerFormHead = $("#layer_form_head");

        this.$setCurrentLayerOnClickInput = $('#set_current_layer_on_click');
        this.$layerIdText = $("#layer_id_text");
        this.$layerTypeText = $("#layer_type_span");
        this.$layerStackPositionNum = $("#stack_position_num");
        this.$layerFormBox = $("#layer_form_box");

        this.$centerLayerHorizontallyBtn = $("#center_layer_horizontally_btn");
        this.$centerLayerVerticallyBtn = $("#center_layer_vertically_btn");

        this.$layerSelect = $("#layer_select");

        this.$moveLayerUpBtn = $("#move_layer_up_btn");
        this.$moveLayerDownBtn = $("#move_layer_down_btn");

        this.$removeLayerBtn = $("#remove_layer_btn");

        this.$bannerSrcInput = $("#banner_src");
        this.$bannerWidthInput = $("#banner_width");
        this.$bannerHeightInput = $("#banner_height");
        this.$bannerBgPositionInput = $("#banner_bg_position");
        this.$overlayColorInput = $("#overlay_color");
        this.$overlayOpacityInput = $("#overlay_opacity");
        this.$overlayHeightInput = $("#overlay_height");
        this.$overlayDockPositionInput = $("#overlay_dock_position");
        this.$backgroundTypeInput = this.$bannerDesignerForm.find("input[name=background_type]");
        this.$overlayGradientColor1Input = $("#overlay_gradient_color1");
        this.$overlayGradientColor2Input = $("#overlay_gradient_color2");
        this.$overlayGradientDirectionInput = this.$bannerDesignerForm.find(
            "input[name=overlay_gradient_direction]");
        
        this.$addTextLayerBtn = $("#add_text_layer_btn");
        this.$addImageLayerBtn = $("#add_image_layer_btn");

        this.$layerDraggedContainer = $("#layer_dragged_container");
        this.$layerDraggedFullNameText = $("#layer_dragged_full_name_text");
        this.$exportBtn = $("#export_btn");
        this.$importBtn = $("#import_btn");
        this.$downloadBannerLink = $("#download_image_btn_link");

        this.$createImageBtn = $('#create_image_btn');

        this.$bannerGeneralSettings = $("#banner_general_settings");

        this.setCurrentLayerOnclick = false;

        this.backgroundType = null;
        this.currentLayerId = null;
        this.layersById = {};
        this.layerOrderList = [];
        this.numLayers = 0;

        this.fixPositionOfLayersOutsideBordersTimeoutId = null;
        this.fixPositionOfLayersOutsideBordersTimeoutDuration = 1000;

        this.eventManager = new EventManager();

        this.maxBannerWidth = options.maxBannerWidth;
        this.maxBannerHeight = options.maxBannerHeight;
        this.onChange = options.onChange || null;
        this.onNewImageCreated = options.onNewImageCreated || null;
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

        this.initInputs(options);
    }

    BannerDesigner.defaultValues = {
        exportEnabled: true,
        importEnabled: true
    };


    BannerDesigner.prototype.each = function(f){
        var self = this;

        this.layerOrderList.forEach(function(layerId){
            var layer = self.layersById[layerId];
            f(layer);
        });
    }

    BannerDesigner.prototype.fixPositionOfLayersOutsideBorders = function(){
        this.each(function(layer){
            layer.fixPositionOutsideBorders();
        });
    }

    BannerDesigner.prototype.fixPositionOfLayersOutsideBordersAsync = function(){
        var self = this;

        if (this.fixPositionOfLayersOutsideBordersTimeoutId !== null)
            clearTimeout(this.fixPositionOfLayersOutsideBordersTimeoutId);

        this.fixPositionOfLayersOutsideBordersTimeoutId = setTimeout(function(){
            self.fixPositionOfLayersOutsideBordersTimeoutId = null;
            self.fixPositionOfLayersOutsideBorders();
        }, this.fixPositionOfLayersOutsideBordersTimeoutDuration);
    }

    BannerDesigner.prototype.setCurrentLayer = function(layerId){
        if (this.currentLayerId !== null && this.currentLayerId === layerId){
            return;
        }

        this.$layerSelect.val(layerId);
        this._setLayerForm(layerId);
    }

    BannerDesigner.prototype._setLayerForm = function(layerId){
        if (this.currentLayerId !== null){
            this.layersById[this.currentLayerId].hideForm();
        }

        if (layerId === "" || layerId === null){
            this.currentLayerId = null;
            this.$layerFormHead.hide();
        } else {
            this.currentLayerId = layerId;

            var layer = this.layersById[layerId];

            this.$layerStackPositionNum.text(layer.positionOrder+1);
            this.$layerIdText.text(layerId);
            this.$layerTypeText.text(layer.layerType);
            this.$layerFormHead.show();

            this.layersById[layerId].showForm();

            this.$moveLayerUpBtn.attr("disabled", "disabled");

            if (layer.positionOrder === 0) {
                this.$moveLayerDownBtn.attr("disabled", "disabled");
            } else {
                this.$moveLayerDownBtn.removeAttr("disabled")
            }

            if (layer.positionOrder === self.numLayers - 1) {
                this.$moveLayerUpBtn.attr("disabled", "disabled");
            } else {
                this.$moveLayerUpBtn.removeAttr("disabled")
            }
        }
    }

    BannerDesigner.prototype.initInputs = function(options){
        var self = this;

        this.$layerSelect.change(function(e){
            var layerId = parseInt(self.$layerSelect.val());
            self._setLayerForm(layerId);


            self.eventManager.trigger("inputchange", {
                'type': 'current_layer_changed',
                'layer_id': layerId
            });
        });

        this.$addTextLayerBtn.click(function(e){
            e.preventDefault();
            self.addLayer("text");
        });

        this.$addImageLayerBtn.click(function(e){
            e.preventDefault();
            self.addLayer("image");
        });

        this.$removeLayerBtn.click(function(e){
            e.preventDefault();
            if (self.currentLayerId !== null){
                self.removeLayer(self.currentLayerId);
            }
        });

        this.$createImageBtn.click(function (e) {
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

                if (self.onNewImageCreated){
                    canvas.toBlob(function(blob){
                        self.onNewImageCreated(blob);
                    });
                }
                // "image/jpeg"
                self.$downloadBannerLink.attr("href", canvas.toDataURL("image/png", 1.0));
                // $(window).scrollTop(s);
                self.$downloadBannerLink.show();
            });

        });

        if (options.exportEnabled){
            this.$exportBtn.click(function(e){
                // var data= $("#banner-designer-form").serializeArray();

                var data = self.exportBanner();
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 4));
                
                this.setAttribute("href", dataStr);
            });
        } else {
            this.$exportBtn.hide();
        }

        if (options.importEnabled){
            this.$importBtn.click(function(e){
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
        } else {
            this.$importBtn.hide();
        }
        //update();

        this.$setCurrentLayerOnClickInput.on("change", function (e) {
            self.setCurrentLayerOnclick = $(this).is(":checked");
        });

        this.$bannerWidthInput.on("input propertychange", function () {
            var widthValue = $(this).val().trim();

            console.log("widthValue, self._height, self._naturalWidth, self._naturalHeight", widthValue, self._height, self._naturalWidth, self._naturalHeight);
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

            self.fixPositionOfLayersOutsideBordersAsync();
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

                if (self._width === null && self._naturalWidth !== null && self._naturalHeight !== null){
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

            self.fixPositionOfLayersOutsideBordersAsync();
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

        this.$backgroundTypeInput.on("input propertychange", function () {
            self.updateBannerBackground();
        });

        this.$overlayColorInput.on("input propertychange", function () {
            if (self.backgroundType !== IMAGE_WITH_OVERLAY) return;

            var overlayColor = $(this).val().trim() || "transparent";
            self.$overlay.css("background-color", overlayColor);
        });

        this.$overlayOpacityInput.on("input", function () {
            if (self.backgroundType !== IMAGE_WITH_OVERLAY) return;

            var opacity = $(this).val().trim() || "1";
            self.$overlay.css("opacity", opacity);
        });

        this.$overlayHeightInput.on("input propertychange", function () {
            var overlayHeight = $(this).val().trim();
            self.$overlay.css("height", overlayHeight);
        });

        this.$overlayDockPositionInput.on("change", function () {
            var overlayPosition = $(this).val();

            if (overlayPosition === "top"){
                self.$overlay.css("top", "0px");
                self.$overlay.css("bottom", "auto");
            } else {
                self.$overlay.css("top", "auto");
                self.$overlay.css("bottom", "0px");
            }
        });

        this.$overlayGradientColor1Input.on("input propertychange", function () {
            if (self.backgroundType !== GRADIENT) return;
            self.initializeOrUpdateGradientBackground();
        });

        this.$overlayGradientColor2Input.on("input propertychange", function () {
            if (self.backgroundType !== GRADIENT) return;
            
            self.initializeOrUpdateGradientBackground();
        });

        this.$overlayGradientDirectionInput.on("input propertychange", function () {
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
            currentLayer.$layerSelectOption.insertBefore(nextLayer.$layerSelectOption);

            swap_position_order(currentLayer, nextLayer)

            self.$layerStackPositionNum.text(currentLayer.positionOrder+1);
            if (currentLayer.positionOrder === self.numLayers-1) self.$moveLayerUpBtn.attr("disabled", "disabled");
            if (self.$moveLayerDownBtn.attr("disabled") !== null) self.$moveLayerDownBtn.removeAttr("disabled");

            self.eventManager.trigger("inputchange", {
                'type': 'layer_moved_up',
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
            currentLayer.$layerSelectOption.insertAfter(previousLayer.$layerSelectOption);

            swap_position_order(currentLayer, previousLayer)

            self.$layerStackPositionNum.text(currentLayer.positionOrder+1);

            if (currentLayer.positionOrder === 0) self.$moveLayerDownBtn.attr("disabled", "disabled");
            if (self.$moveLayerUpBtn.attr("disabled") !== null) self.$moveLayerUpBtn.removeAttr("disabled");

            self.eventManager.trigger("inputchange", {
                'type': 'layer_moved_down',
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

        this.$centerLayerHorizontallyBtn.click(function(e){
            e.preventDefault();

            var layer = self.layersById[self.currentLayerId]
            var left = (self.$banner.width() - layer.$layer.width()) / 2;

            layer.$layerLeftInput.val(left);
            layer.$layer.css("left", left);
        });

        this.$centerLayerVerticallyBtn.click(function(e){
            e.preventDefault();

            var layer = self.layersById[self.currentLayerId];
            var top = (self.$banner.height() - layer.$layer.height()) / 2;

            layer.$layerTopInput.val(top);
            layer.$layer.css("top", top);
        });

        this.$bannerGeneralSettings.on("input propertychange", "input, select, textarea", function(){
            var input = this;

            self.eventManager.trigger("inputchange", {
                'type': 'banner_general_settings_input_change',
                'input': input
            });
        });

        this.eventManager.on("inputchange", function(){
            self.$downloadBannerLink.hide();
        });

        this.updateBannerBackground();
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

        this._getBackgroundImageNaturalDimensions(imageurl, function(naturalWidth, naturalHeight){
            var width, height;

            if (self._width === null && self._height === null){
                self._width = width;
                self._height = height;

                // TODO: Mejorar para hacerlo mas inteligente
                self.$banner.height(self._height);
                self.$bannerHeightInput.val("");
                self.$banner.width(self._width);
                self.$bannerWidthInput.val("");
            } else if (self._width === null){
                width = Math.round( (self._height * naturalWidth) /  naturalHeight);

                self.$banner.width(width);
                self.$bannerWidthInput.val("");
            } else if (self._height === null){
                height = Math.round( (self._width * naturalHeight) /  naturalWidth);

                self.$banner.height(height);
                self.$bannerHeightInput.val("");
            }
        });
    }

    BannerDesigner.prototype._getBackgroundImageNaturalDimensions = function(imageurl, cb){
        var self = this;

        var img = document.createElement("img");	
        img.onload = function() {
            self._naturalWidth = this.width;
            self._naturalHeight = this.height;

            if (cb) cb(this.width, this.height);
        }
        img.onerror = function() {
            self._naturalWidth = null;
            self._naturalHeight = null;
        }     
        img.src = imageurl;
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

        this.$bannerDesignerForm.find(':checkbox').each(function(){
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

        var layer = new this.layerClasses[layerType]();
        layer.init(this);

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
            this.layersById[this.layerOrderList[i]].positionOrder -= 1;
        }

        delete this.layersById[layerId];

        this.eventManager.trigger("inputchange", {
            'type': 'removed_layer',
            'layer_id': layerId
        });
    }

    BannerDesigner.prototype.updateBannerBackground = function(){
        var backgroundTypeValue = this.$backgroundTypeInput.filter(":checked").val();

        if (backgroundTypeValue === "image_with_overlay"){
            this.initializeOrUpdateImageOverlayBackground()
        } else if (backgroundTypeValue === "gradient") {
            this.initializeOrUpdateGradientBackground();
        }

        return backgroundTypeValue;
    }

    BannerDesigner.prototype.createImageOverlayBackground = function(imageurl, overlayColor, overlayOpacity, overlayHeight, overlayPosition){
        this.backgroundType = IMAGE_WITH_OVERLAY;

        if (imageurl){
            this.$banner.css("background-image", "url(" + imageurl + ")");
        } else {
            this.$banner.css("background-image", "none");
        }

        this.$overlay.css("background-color", overlayColor);
        this.$overlay.css("opacity", overlayOpacity);

        this.$overlay.css("height", overlayHeight);

        if (overlayPosition === "top"){
            this.$overlay.css("top", "0px");
            this.$overlay.css("bottom", "auto");
        } else {
            this.$overlay.css("top", "auto");
            this.$overlay.css("bottom", "0px");
        }
    }

    BannerDesigner.prototype.initializeOrUpdateImageOverlayBackground = function(){
        var imageurl = this.$bannerSrcInput.val().trim();
        var overlayColor = this.$overlayColorInput.val().trim();
        var overlayOpacity = this.$overlayOpacityInput.val().trim();
        var overlayHeight = this.$overlayHeightInput.val().trim();
        var overlayPosition = this.$overlayDockPositionInput.val();
        if (overlayPosition)
            overlayPosition = overlayPosition.trim();

        this.createImageOverlayBackground(imageurl, overlayColor, overlayOpacity, overlayPosition);
    }

    BannerDesigner.prototype.createGradientBackground = function(color1, color2, direction){
        this.backgroundType = GRADIENT;

        var background = gradientBackgroundStyle(direction, color1, color2);

        this.$banner.css("background-image", background);
        this.$overlay.css("opacity", 0);
    }

    BannerDesigner.prototype.initializeOrUpdateGradientBackground = function(){
        var color1 = this.$overlayGradientColor1Input.val();
        var color2 = this.$overlayGradientColor2Input.val();

        var direction = this.$overlayGradientDirectionInput.filter(':checked').val();

        this.createGradientBackground(color1, color2, direction);
    }

    BannerDesigner.prototype.importBanner = function(data){
        //$("#banner-designer-form").deserialize(data);
        var self = this;

        this.reset();

        console.log("importing banner...", data);

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

        this.$bannerBgPositionInput.val(data.banner_bg_position);
        this.$overlayColorInput.val(data.overlay_color);
        this.$overlayOpacityInput.val(data.overlay_opacity);
        this.$overlayGradientColor1Input.val(data.overlay_gradient_color1);
        this.$overlayGradientColor2Input.val(data.overlay_gradient_color2);
        this.$overlayHeightInput.val(data.overlay_height);
        this.$overlayDockPositionInput.val(data.overlay_dock_position);

        this.$overlayGradientDirectionInput.filter("[value='" + data.overlay_gradient_direction + "']").prop("checked", true);
        this.$backgroundTypeInput.filter("[value='" + data.background_type + "']").prop("checked", true);

        if (data.banner_src){
            this.$bannerSrcInput.val(data.banner_src);

            if (this.useCustomImageUrlGetter){
                this.$bannerSrcInput.trigger("init");
            } else {
                this.setBannerSrc(data.banner_src);
            }
        }

        if (data.set_current_layer_on_click !== undefined){
            this.setCurrentLayerOnClick = !!data.set_current_layer_on_click;

            if (this.setCurrentLayerOnClick){
                this.$setCurrentLayerOnClickInput.get(0).checked = true;
            } else {
                this.$setCurrentLayerOnClickInput.get(0).checked = false;
            }
        }

        if (data.background_type){
            if (data.background_type === "image_with_overlay"){
                this.backgroundType = IMAGE_WITH_OVERLAY;

                if (data.overlay_opacity){
                    this.$overlay.css("opacity", data.overlay_opacity);
                }

                if (data.overlay_color){
                    this.$overlay.css("background-color", data.overlay_color);
                }
            } else if (data.background_type === "gradient") {
                this.createGradientBackground(data.overlay_gradient_color1, data.overlay_gradient_color2, data.overlay_gradient_direction);
            } else {
                console.log("Warning: Unknown background type: " + data.background_type);
            }
        }

        if (data.layers){
            data.layers.forEach(function(layerConfig, layerIndex){
                var layerClass = self.layerClasses[layerConfig.layer_type];
                var layer = new layerClass();
                layer.init(self, layerConfig);

                if (data.current_layer_index !== layerIndex) {
                    layer.hideForm();
                }

                self.layersById[layer.layerId] = layer;
                self.layerOrderList.push(layer.layerId);
            });
        }

        if (data.current_layer_index !== undefined && data.current_layer_index !== null){
            var currentLayer = this.layersById[this.layerOrderList[data.current_layer_index]];

            this.currentLayerId = currentLayer.layerId;
            this.$layerSelect.val(this.currentLayerId);
        } else {
            this.$layerSelect.val("");
        }
    }

    BannerDesigner.createBanner = function(data){
        var $banner = $('<div class="banner banner-static"></div>');
        if (data.id){
            $banner.attr("id", "banner" + data.id);
        }

        if (data.banner_width){
            $banner.width(data.banner_width +"px");
        }

        if (data.banner_height){
            $banner.height(data.banner_height +"px");
        }

        if (data.background_type === "image_with_overlay"){
            var $overlay = $('<div class="banner_overlay"></div>');
            $banner.append($overlay);

            if (data.banner_src){
                $banner.css("background-image", "url(" + data.banner_src + ")");
            }

            if (data.overlay_opacity){
                $overlay.css("opacity", data.overlay_opacity);
            }

            if (data.overlay_color){
                $overlay.css("background-color", data.overlay_color);
            }

            if (data.overlay_height){
                $overlay.css("height", data.overlay_height);
            }

            if (data.overlay_dock_position){
                if (data.overlay_dock_position === "top"){
                    $overlay.css("top", "0px");
                    $overlay.css("bottom", "auto");
                } else {
                    $overlay.css("top", "auto");
                    $overlay.css("bottom", "0px");
                }
            }
        } else if (data.background_type === "gradient") {
            var background = gradientBackgroundStyle(data.overlay_gradient_direction, data.overlay_gradient_color1, data.overlay_gradient_color2);

            $banner.css("background-image", background);
        }

        if (data.layers){
            data.layers.forEach(function(layerConfig){
                var layerClass = self.layerClasses[layerConfig.layer_type];
                var layer = new layerClass();
                layer.appendLayerInBanner($banner, layerConfig);
            });
        }

        return $banner;
    }

    BannerDesigner.processBannersInPage = function(root){
        var $banners;

        if (root){
            var $root = $(root);
            $banners = $root.find(".banner[data-banner]");
        } else {
            $banners = $(".banner[data-banner]");
        }

        $banners.each(function(){
            var $el = $(this);
            var bannerConfig = $el.data();
            var $banner = BannerDesigner.createBanner(bannerConfig);

            $el.replaceWith($banner);
        });
    }

    BannerDesigner.prototype.exportBanner = function(){
        var self = this;

        var current_layer_index = this.layerOrderList.indexOf(this.currentLayerId);
        if (current_layer_index === -1) current_layer_index = null;

        var banner_width = this.$bannerWidthInput.val().trim() || null;
        var banner_height = this.$bannerHeightInput.val().trim() || null;

        var background_type = this.$backgroundTypeInput.filter(":checked").val();
        var banner_src = this.$bannerSrcInput.val();
        var banner_bg_position = this.$bannerBgPositionInput.val();
        var overlay_color = this.$overlayColorInput.val();
        var overlay_opacity = this.$overlayOpacityInput.val();
        var overlay_gradient_color1 = this.$overlayGradientColor1Input.val();
        var overlay_gradient_color2 = this.$overlayGradientColor2Input.val();
        var overlay_gradient_direction = this.$overlayGradientDirectionInput.filter(':checked').val();
        var overlay_height = this.$overlayHeightInput.val();
        var overlay_dock_position = this.$overlayDockPositionInput.val();
        var set_current_layer_on_click = this.$setCurrentLayerOnClickInput.is(":checked");

        var layers = this.layerOrderList.map(function(layerId){
            return self.layersById[layerId].exportData();
        });

        var data = {
            current_layer_index: current_layer_index,
            banner_width: banner_width,
            banner_height: banner_height,
            set_current_layer_on_click: set_current_layer_on_click,
            background_type: background_type,
            banner_src: banner_src,
            banner_bg_position: banner_bg_position,
            overlay_color: overlay_color,
            overlay_height: overlay_height,
            overlay_opacity: overlay_opacity,
            overlay_dock_position: overlay_dock_position,
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

    BannerDesigner.init = function(options){
        if (bannerDesigner !== null) throw "Banner designer already initialized";

        bannerDesigner = new BannerDesigner(options);
        return bannerDesigner;
    }

    global.BannerDesigner = BannerDesigner;
})(jQuery, this);
