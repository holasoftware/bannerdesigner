Banner Designer
---------------

Version: 0.5

Easy banner designer using draggable layers.

Features:
- Convert the banner to an image.
- Import/Export the state of the design.
- Possiblity to choose between a background image with an optional overlay or a background gradient.
- Draggable layers.
- 2 layers types added by default: Text layer and image layer.
- Layer text with optional background color and transparency.
- Tools to center layer horizontally or vertically.
- Change the layer stack moving one layer above another.
- The name of the layer that is currently dragged is shown.
- Responsive UI.
- Extend the designer creating new layer types.


Try here: https://holasoftware.github.io/bannerdesigner/

Notes
-----
For the conversion of the banner to an image, it's required that the images comes from the same origin. 

For local files, you can use a local web server. For example:

    python -m http.server
    
For images from a different host, one possiblity is to use a proxy web. There is a hook to convert the image urls to another one proxified. The option `imageUrlHook` in the
 settings of BannerDesigner class could be a template url containing the placeholder '{url}' for the replacement of the url intended to proxify (for example in the query string), or a function making the conversion to the proxified url. 

