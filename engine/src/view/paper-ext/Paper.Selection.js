/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

paper.Selection = class {
    /**
     * Create a new paper.js selection.
     * @param {paper.Layer} layer - the layer to add the selection GUI to. Defaults to the active layer.
     * @param {paper.Item[]} items - the items to select.
     * @param {number} x - the amount the selection is translated on the x-axis
     * @param {number} y - the amount the selection is translated on the y-axis
     * @param {number} scaleX - the amount the selection is scaled on the x-axis
     * @param {number} scaleY - the amount the selection is scaled on the y-axis
     * @param {number} rotation - the amount the selection is rotated
     * @param {number} originX - the origin point of all transforms. Defaults to the center of selected items.
     * @param {number} originY - the origin point of all transforms. Defaults to the center of selected items.
     */
    constructor (args) {
        console.log("Created Selection");

        if(!args) args = {};

        this._lockScalingToAspectRatio = false;

        this._layer = args.layer || paper.project.activeLayer;
        this._items = args.items || [];
        this._transformation = {
            x: args.x || 0,
            y: args.y || 0,
            scaleX: args.scaleX || 1.0,
            scaleY: args.scaleY || 1.0,
            rotation: args.rotation || 0,
            originX: 0,
            originY: 0,
        };

        this._untransformedBounds = paper.Selection._getBoundsOfItems(this._items);

        // Origin/pivot point is set to the center of the bounds, unless one is given in args
        if(args.originX !== undefined) {
            this._transformation.originX = args.originX;
        } else {
            this._transformation.originX = this._untransformedBounds.center.x;
        }

        if(args.originY !== undefined) {
            this._transformation.originY = args.originY;
        } else {
            this._transformation.originY = this._untransformedBounds.center.y;
        }

        this._rebuild();
    }

    /**
     * The layer where the selection GUI was created.
     * @type {paper.Layer}
     */
    get layer () {
        return this._layer;
    }

    /**
     * The items in this selection.
     * @type {paper.Item[]}
     */
    get items () {
        return this._items;
    }

    set items (items) {
        this._destroy(false);
        this._items = items;
    }

    /**
     * The transformation applied to the selected items.
     * @type {object}
     */
    get transformation () {
        return JSON.parse(JSON.stringify(this._transformation));
    }

    set transformation (transformation) {
        this._destroy(true);
        this._transformation = transformation;
        this._create();
    }

    /**
     * Update the transformation with new values.
     * @param {object} newTransformation - an object containing new values for the transformation.
     */
    updateTransformation (newTransformation) {
        this.transformation = Object.assign(this.transformation, newTransformation);
    }

    /**
     * Toggles if scaling will preserve aspect ratio.
     * @type {boolean}
     */
    get lockScalingToAspectRatio () {
        return this._lockScalingToAspectRatio;
    }

    set lockScalingToAspectRatio (lockScalingToAspectRatio) {
        this._lockScalingToAspectRatio = lockScalingToAspectRatio;
    }

    /**
     * The absolute position of the top-left handle of the selection.
     * @type {paper.Point}
     */
    get position () {
        return this._untransformedBounds.topLeft.transform(this._matrix);
    }

    set position (position) {
        var d = position.subtract(this.position);
        this.updateTransformation({
            x: this.transformation.x + d.x,
            y: this.transformation.y + d.y,
        });
    }

    /**
     * The absolute position of the origin of the selection.
     * @type {paper.Point}
     */
    get origin () {
        return new paper.Point(
            this._transformation.originX,
            this._transformation.originY
        ).transform(this._matrix);
    }

    set origin (origin) {
        var d = origin.subtract(this.origin);
        this.updateTransformation({
            x: this.transformation.x + d.x,
            y: this.transformation.y + d.y,
        });
    }

    /**
     * The width of the selection.
     * @type {number}
     */
    get width () {
        return this._untransformedBounds.width * this.transformation.scaleX;
    }

    set width (width) {
        var d = this.width / width;
        this.updateTransformation({
            scaleX: this.transformation.scaleX / d,
        });
    }

    /**
     * The height of the selection.
     * @type {number}
     */
    get height () {
        return this._untransformedBounds.height * this.transformation.scaleY;
    }

    set height (height) {
        var d = this.height / height;
        this.updateTransformation({
            scaleY: this.transformation.scaleY / d,
        });
    }

    /**
     * The x-scale of the selection.
     * @type {number}
     */
    get scaleX () {
        return this.transformation.scaleX;
    }

    set scaleX (scaleX) {
        this.updateTransformation({
            scaleX: scaleX,
        });
    }

    /**
     * The y-scale of the selection.
     * @type {number}
     */
    get scaleY () {
        return this.transformation.scaleY;
    }

    set scaleY (scaleY) {
        this.updateTransformation({
            scaleY: scaleY,
        });
    }

    /**
     * The rotation of the selection.
     * @type {number}
     */
    get rotation () {
        return this.transformation.rotation;
    }

    set rotation (rotation) {
        this.updateTransformation({
            rotation: rotation,
        });
    }

    /**
     * Return a paper.js path attribute of the selection.
     * @param {string} attributeName - the name of the attribute
     */
    getPathAttribute (attributeName) {
        if(this.items.length === 0) {
            console.error('getPathAttribute(): Nothing in the selection!');
        }
        return this.items[0][attributeName];
    }

    /**
     * Update a paper.js path attribute of the selection.
     * @param {string} attributeName - the name of the attribute
     * @param {object} attributeValue - the value of the attribute to change
     */
    setPathAttrribute (attributeName, attributeValue) {
        this.items.forEach(item => {
            item[attributeName] = attributeValue;
        });
    }

    /**
     * The fill color of the selection.
     */
    get fillColor () {
        return this.getPathAttribute('fillColor');
    }

    set fillColor (fillColor) {
        this.setPathAttrribute('fillColor', fillColor);
    }

    /**
     * The stroke color of the selection.
     */
    get strokeColor () {
        return this.getPathAttribute('strokeColor');
    }

    set strokeColor (strokeColor) {
        this.setPathAttrribute('strokeColor', strokeColor);
    }

    /**
     * The stroke color of the selection.
     */
    get strokeWidth () {
        return this.getPathAttribute('strokeWidth');
    }

    set strokeWidth (strokeWidth) {
        this.setPathAttrribute('strokeWidth', strokeWidth);
    }

    /**
     * Flip the selection horizontally.
     */
    flipHorizontally () {
        // TODO replace
        /*
        this.updateTransformation({
            scaleX: -this.transformation.scaleX,
        });
        */
    }

    /**
     * Flip the selection vertically.
     */
    flipVertically () {
        // TODO replace
        /*
        this.updateTransformation({
            scaleY: -this.transformation.scaleY,
        });
        */
    }

    /**
     * Moves the selected items forwards.
     */
    moveForwards () {
        paper.Selection._sortItemsByLayer(this._items).forEach(items => {
            paper.Selection._sortItemsByZIndex(items).reverse().forEach(item => {
                if(item.nextSibling && this._items.indexOf(item.nextSibling) === -1) {
                    item.insertAbove(item.nextSibling);
                }
            });
        });
    }

    /**
     * Moves the selected items backwards.
     */
    moveBackwards () {
        paper.Selection._sortItemsByLayer(this._items).forEach(items => {
            paper.Selection._sortItemsByZIndex(items).forEach(item => {
                if(item.previousSibling && this._items.indexOf(item.previousSibling) === -1) {
                    item.insertBelow(item.previousSibling);
                }
            });
        });
    }

    /**
     * Brings the selected objects to the front.
     */
    bringToFront () {
        paper.Selection._sortItemsByLayer(this._items).forEach(items => {
            paper.Selection._sortItemsByZIndex(items).forEach(item => {
                item.bringToFront();
            });
        });
    }

    /**
     * Sends the selected objects to the back.
     */
    sendToBack () {
        paper.Selection._sortItemsByLayer(this._items).forEach(items => {
            paper.Selection._sortItemsByZIndex(items).reverse().forEach(item => {
                item.sendToBack();
            });
        });
    }

    /**
     * Nudge the selection by a specified amount.
     */
    nudge (x, y) {
        // TODO replace
        //this.position = this.position.add(new paper.Point(x, y));
    }

    /**
     * Move a handle and use the new handle position to scale the selection.
     * @param {string} handleName - the name of the handle to move
     * @param {paper.Point} position - the position to move the handle to
     */
    moveHandleAndScale (handleName, position) {
        /*
        var newHandlePosition = position;
        var currentHandlePosition = this._untransformedBounds[handleName];

        currentHandlePosition = currentHandlePosition.add(new paper.Point(this.transformation.x, this.transformation.y));

        newHandlePosition = newHandlePosition.subtract(this.origin);
        currentHandlePosition = currentHandlePosition.subtract(this.origin);

        newHandlePosition = newHandlePosition.rotate(-this.rotation, new paper.Point(0,0));

        var newScale = newHandlePosition.divide(currentHandlePosition);

        var lockYScale = handleName === 'leftCenter'
                      || handleName === 'rightCenter';
        var lockXScale = handleName === 'bottomCenter'
                      || handleName === 'topCenter';

        if(lockXScale) newScale.x = this.transformation.scaleX;
        if(lockYScale) newScale.y = this.transformation.scaleY;

        this.updateTransformation({
            scaleX: newScale.x,
            scaleY: this.lockScalingToAspectRatio ? newScale.x : newScale.y,
        });
        */
    }

    /**
     * Move a handle and use the new position of the handle to rotate the selection.
     * @param {string} handleName - the name of the handle to move
     * @param {paper.Point} position - the position to move the handle to
     */
    moveHandleAndRotate (handleName, position) {
        /*
        var newHandlePosition = position;
        var currentHandlePosition = this._untransformedBounds[handleName];

        currentHandlePosition = currentHandlePosition.transform(this._matrix);

        newHandlePosition = newHandlePosition.subtract(this.origin);
        currentHandlePosition = currentHandlePosition.subtract(this.origin);

        var angleDiff = newHandlePosition.angle - currentHandlePosition.angle;

        this.updateTransformation({
            rotation: this.transformation.rotation + angleDiff,
        });
        */
    }

    _rebuild () {
        if(this._gui) {
            this._gui.destroy();
        }

        this._gui = new paper.SelectionGUI({
            items: this._items,
            transformation: this._transformation,
            bounds: this._untransformedBounds,
        });

        // Don't add GUI to paper if nothing is selected...
        if(this._items.length > 0) {
            this._layer.addChild(this._gui.item);
        }
    }

    _destroy () {
        this._gui.destroy();
    }

    /* helper function: calculate the bounds of the smallest rectangle that contains all given items. */
    static _getBoundsOfItems (items) {
        if(items.length === 0)
            return new paper.Rectangle();

        var bounds = null;
        items.forEach(item => {
            bounds = bounds ? bounds.unite(item.bounds) : item.bounds;
        });

        return bounds;
    }

    /* helper function for ordering */
    static _sortItemsByLayer (items) {
        var layerLists = {};

        items.forEach(item => {
            // Create new list for the item's layer if it doesn't exist
            var layerID = item.layer.id;
            if(!layerLists[layerID]) {
                layerLists[layerID] = [];
            }

            // Add this item to its corresponding layer list
            layerLists[layerID].push(item);
        });

        // Convert id->array object to array of arrays
        var layerItemsArrays = [];
        for (var layerID in layerLists) {
            layerItemsArrays.push(layerLists[layerID])
        }
        return layerItemsArrays;
    }

    /* helper function for ordering */
    static _sortItemsByZIndex (items) {
        return items.sort(function (a,b) {
            return a.index - b.index;
        });
    }
};

paper.PaperScope.inject({
    Selection: paper.Selection,
});
