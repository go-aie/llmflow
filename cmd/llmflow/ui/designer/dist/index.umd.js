(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.sequentialWorkflowDesigner = {}));
})(this, (function (exports) { 'use strict';

	class ControlBarApi {
	    constructor(state, historyController, definitionModifier, viewportApi) {
	        this.state = state;
	        this.historyController = historyController;
	        this.definitionModifier = definitionModifier;
	        this.viewportApi = viewportApi;
	    }
	    /**
	     * @deprecated Don't use this method
	     */
	    subscribe(handler) {
	        // TODO: this should be refactored
	        this.state.onIsReadonlyChanged.subscribe(handler);
	        this.state.onSelectedStepIdChanged.subscribe(handler);
	        this.state.onIsDragDisabledChanged.subscribe(handler);
	        if (this.isUndoRedoSupported()) {
	            this.state.onDefinitionChanged.subscribe(handler);
	        }
	    }
	    resetViewport() {
	        this.viewportApi.resetViewport();
	    }
	    zoomIn() {
	        this.viewportApi.zoom(true);
	    }
	    zoomOut() {
	        this.viewportApi.zoom(false);
	    }
	    isDragDisabled() {
	        return this.state.isDragDisabled;
	    }
	    toggleIsDragDisabled() {
	        this.state.toggleIsDragDisabled();
	    }
	    isUndoRedoSupported() {
	        return !!this.historyController;
	    }
	    tryUndo() {
	        if (this.canUndo() && this.historyController) {
	            this.historyController.undo();
	            return true;
	        }
	        return false;
	    }
	    canUndo() {
	        return !!this.historyController && this.historyController.canUndo() && !this.state.isReadonly && !this.state.isDragging;
	    }
	    tryRedo() {
	        if (this.canRedo() && this.historyController) {
	            this.historyController.redo();
	            return true;
	        }
	        return false;
	    }
	    canRedo() {
	        return !!this.historyController && this.historyController.canRedo() && !this.state.isReadonly && !this.state.isDragging;
	    }
	    tryDelete() {
	        if (this.canDelete() && this.state.selectedStepId) {
	            this.definitionModifier.tryDelete(this.state.selectedStepId);
	            return true;
	        }
	        return false;
	    }
	    canDelete() {
	        return (!!this.state.selectedStepId &&
	            !this.state.isReadonly &&
	            !this.state.isDragging &&
	            this.definitionModifier.isDeletable(this.state.selectedStepId));
	    }
	}

	class SimpleEvent {
	    constructor() {
	        this.listeners = [];
	    }
	    subscribe(listener) {
	        this.listeners.push(listener);
	    }
	    unsubscribe(listener) {
	        const index = this.listeners.indexOf(listener);
	        if (index >= 0) {
	            this.listeners.splice(index, 1);
	        }
	        else {
	            throw new Error('Unknown listener');
	        }
	    }
	    forward(value) {
	        if (this.listeners.length > 0) {
	            this.listeners.forEach(listener => listener(value));
	        }
	    }
	    count() {
	        return this.listeners.length;
	    }
	}

	class Vector {
	    constructor(x, y) {
	        this.x = x;
	        this.y = y;
	    }
	    add(v) {
	        return new Vector(this.x + v.x, this.y + v.y);
	    }
	    subtract(v) {
	        return new Vector(this.x - v.x, this.y - v.y);
	    }
	    multiplyByScalar(s) {
	        return new Vector(this.x * s, this.y * s);
	    }
	    divideByScalar(s) {
	        return new Vector(this.x / s, this.y / s);
	    }
	    round() {
	        return new Vector(Math.round(this.x), Math.round(this.y));
	    }
	    distance() {
	        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	    }
	}

	exports.DefinitionChangeType = void 0;
	(function (DefinitionChangeType) {
	    DefinitionChangeType[DefinitionChangeType["stepNameChanged"] = 1] = "stepNameChanged";
	    DefinitionChangeType[DefinitionChangeType["stepPropertyChanged"] = 2] = "stepPropertyChanged";
	    DefinitionChangeType[DefinitionChangeType["stepChildrenChanged"] = 3] = "stepChildrenChanged";
	    DefinitionChangeType[DefinitionChangeType["stepDeleted"] = 4] = "stepDeleted";
	    DefinitionChangeType[DefinitionChangeType["stepMoved"] = 5] = "stepMoved";
	    DefinitionChangeType[DefinitionChangeType["stepInserted"] = 6] = "stepInserted";
	    DefinitionChangeType[DefinitionChangeType["globalPropertyChanged"] = 7] = "globalPropertyChanged";
	    DefinitionChangeType[DefinitionChangeType["rootReplaced"] = 8] = "rootReplaced";
	})(exports.DefinitionChangeType || (exports.DefinitionChangeType = {}));
	class DesignerState {
	    constructor(definition, isReadonly, isToolboxCollapsed, isEditorCollapsed) {
	        this.definition = definition;
	        this.isReadonly = isReadonly;
	        this.isToolboxCollapsed = isToolboxCollapsed;
	        this.isEditorCollapsed = isEditorCollapsed;
	        this.onViewportChanged = new SimpleEvent();
	        this.onSelectedStepIdChanged = new SimpleEvent();
	        this.onFolderPathChanged = new SimpleEvent();
	        this.onIsReadonlyChanged = new SimpleEvent();
	        this.onIsDraggingChanged = new SimpleEvent();
	        this.onIsDragDisabledChanged = new SimpleEvent();
	        this.onDefinitionChanged = new SimpleEvent();
	        this.onIsToolboxCollapsedChanged = new SimpleEvent();
	        this.onIsEditorCollapsedChanged = new SimpleEvent();
	        this.viewport = {
	            position: new Vector(0, 0),
	            scale: 1
	        };
	        this.selectedStepId = null;
	        this.folderPath = [];
	        this.isDragging = false;
	        this.isDragDisabled = false;
	    }
	    setSelectedStepId(stepId) {
	        if (this.selectedStepId !== stepId) {
	            this.selectedStepId = stepId;
	            this.onSelectedStepIdChanged.forward(stepId);
	        }
	    }
	    pushStepIdToFolderPath(stepId) {
	        this.folderPath.push(stepId);
	        this.onFolderPathChanged.forward(this.folderPath);
	    }
	    setFolderPath(path) {
	        this.folderPath = path;
	        this.onFolderPathChanged.forward(path);
	    }
	    tryGetLastStepIdFromFolderPath() {
	        return this.folderPath.length > 0 ? this.folderPath[this.folderPath.length - 1] : null;
	    }
	    setDefinition(definition) {
	        this.definition = definition;
	        this.notifyDefinitionChanged(exports.DefinitionChangeType.rootReplaced, null);
	    }
	    notifyDefinitionChanged(changeType, stepId) {
	        this.onDefinitionChanged.forward({ changeType, stepId });
	    }
	    setViewport(viewport) {
	        this.viewport = viewport;
	        this.onViewportChanged.forward(viewport);
	    }
	    setIsReadonly(isReadonly) {
	        if (this.isReadonly !== isReadonly) {
	            this.isReadonly = isReadonly;
	            this.onIsReadonlyChanged.forward(isReadonly);
	        }
	    }
	    setIsDragging(isDragging) {
	        if (this.isDragging !== isDragging) {
	            this.isDragging = isDragging;
	            this.onIsDraggingChanged.forward(isDragging);
	        }
	    }
	    toggleIsDragDisabled() {
	        this.isDragDisabled = !this.isDragDisabled;
	        this.onIsDragDisabledChanged.forward(this.isDragDisabled);
	    }
	    setIsToolboxCollapsed(isCollapsed) {
	        if (this.isToolboxCollapsed !== isCollapsed) {
	            this.isToolboxCollapsed = isCollapsed;
	            this.onIsToolboxCollapsedChanged.forward(isCollapsed);
	        }
	    }
	    setIsEditorCollapsed(isCollapsed) {
	        if (this.isEditorCollapsed !== isCollapsed) {
	            this.isEditorCollapsed = isCollapsed;
	            this.onIsEditorCollapsedChanged.forward(isCollapsed);
	        }
	    }
	}

	class Dom {
	    static svg(name, attributes) {
	        const element = document.createElementNS('http://www.w3.org/2000/svg', name);
	        if (attributes) {
	            Dom.attrs(element, attributes);
	        }
	        return element;
	    }
	    static translate(element, x, y) {
	        element.setAttribute('transform', `translate(${x}, ${y})`);
	    }
	    static attrs(element, attributes) {
	        Object.keys(attributes).forEach(name => {
	            const value = attributes[name];
	            element.setAttribute(name, typeof value === 'string' ? value : value.toString());
	        });
	    }
	    static element(name, attributes) {
	        const element = document.createElement(name);
	        if (attributes) {
	            Dom.attrs(element, attributes);
	        }
	        return element;
	    }
	    static toggleClass(element, isEnabled, className) {
	        if (isEnabled) {
	            element.classList.add(className);
	        }
	        else {
	            element.classList.remove(className);
	        }
	    }
	}

	// Source: https://fonts.google.com/icons or https://github.com/google/material-design-icons
	class Icons {
	    static appendPath(parent, pathClassName, d, size) {
	        const g = Dom.svg('g');
	        const scale = size / 48;
	        const path = Dom.svg('path', {
	            d,
	            class: pathClassName,
	            transform: `scale(${scale})`
	        });
	        g.appendChild(path);
	        parent.appendChild(g);
	        return g;
	    }
	    static createSvg(className, d) {
	        const icon = Dom.svg('svg', {
	            class: className,
	            viewBox: '0 0 48 48'
	        });
	        const path = Dom.svg('path', {
	            d,
	            class: 'sqd-icon-path'
	        });
	        icon.appendChild(path);
	        return icon;
	    }
	}
	Icons.folderIn = 'M42.05 42.25H11.996v-7.12h17.388L6 11.746 11.546 6.2 34.93 29.584V12.196h7.12V42.25z';
	Icons.folderOut = 'M6 6.2h30.054v7.12H18.666L42.05 36.704l-5.546 5.546L13.12 18.866v17.388H6V6.2z';
	Icons.center = 'M9 42q-1.2 0-2.1-.9Q6 40.2 6 39v-8.6h3V39h8.6v3Zm21.4 0v-3H39v-8.6h3V39q0 1.2-.9 2.1-.9.9-2.1.9ZM24 31.15q-3.15 0-5.15-2-2-2-2-5.15 0-3.15 2-5.15 2-2 5.15-2 3.15 0 5.15 2 2 2 2 5.15 0 3.15-2 5.15-2 2-5.15 2ZM6 17.6V9q0-1.2.9-2.1Q7.8 6 9 6h8.6v3H9v8.6Zm33 0V9h-8.6V6H39q1.2 0 2.1.9.9.9.9 2.1v8.6Z';
	Icons.zoomIn = 'M39.8 41.95 26.65 28.8q-1.5 1.3-3.5 2.025-2 .725-4.25.725-5.4 0-9.15-3.75T6 18.75q0-5.3 3.75-9.05 3.75-3.75 9.1-3.75 5.3 0 9.025 3.75 3.725 3.75 3.725 9.05 0 2.15-.7 4.15-.7 2-2.1 3.75L42 39.75Zm-20.95-13.4q4.05 0 6.9-2.875Q28.6 22.8 28.6 18.75t-2.85-6.925Q22.9 8.95 18.85 8.95q-4.1 0-6.975 2.875T9 18.75q0 4.05 2.875 6.925t6.975 2.875ZM17.3 24.3v-4.1h-4.1v-3h4.1v-4.05h3v4.05h4.05v3H20.3v4.1Z';
	Icons.zoomOut = 'M39.8 41.95 26.65 28.8q-1.5 1.3-3.5 2.025-2 .725-4.25.725-5.4 0-9.15-3.75T6 18.75q0-5.3 3.75-9.05 3.75-3.75 9.1-3.75 5.3 0 9.025 3.75 3.725 3.75 3.725 9.05 0 2.15-.7 4.15-.7 2-2.1 3.75L42 39.75Zm-20.95-13.4q4.05 0 6.9-2.875Q28.6 22.8 28.6 18.75t-2.85-6.925Q22.9 8.95 18.85 8.95q-4.1 0-6.975 2.875T9 18.75q0 4.05 2.875 6.925t6.975 2.875Zm-5.1-8.35v-3H23.8v3Z';
	Icons.undo = 'M14 38v-3h14.45q3.5 0 6.025-2.325Q37 30.35 37 26.9t-2.525-5.775Q31.95 18.8 28.45 18.8H13.7l5.7 5.7-2.1 2.1L8 17.3 17.3 8l2.1 2.1-5.7 5.7h14.7q4.75 0 8.175 3.2Q40 22.2 40 26.9t-3.425 7.9Q33.15 38 28.4 38Z';
	Icons.redo = 'M19.6 38q-4.75 0-8.175-3.2Q8 31.6 8 26.9t3.425-7.9q3.425-3.2 8.175-3.2h14.7l-5.7-5.7L30.7 8l9.3 9.3-9.3 9.3-2.1-2.1 5.7-5.7H19.55q-3.5 0-6.025 2.325Q11 23.45 11 26.9t2.525 5.775Q16.05 35 19.55 35H34v3Z';
	Icons.move = 'm24 44-8.15-8.15 2.2-2.2 4.45 4.45v-9.45h3v9.45l4.45-4.45 2.2 2.2ZM11.9 31.9 4 24l7.95-7.95 2.2 2.2L9.9 22.5h9.45v3H9.9l4.2 4.2Zm24.2 0-2.2-2.2 4.2-4.2h-9.4v-3h9.4l-4.2-4.2 2.2-2.2L44 24ZM22.5 19.3V9.9l-4.2 4.2-2.2-2.2L24 4l7.9 7.9-2.2 2.2-4.2-4.2v9.4Z';
	Icons.delete = 'm16.5 33.6 7.5-7.5 7.5 7.5 2.1-2.1-7.5-7.5 7.5-7.5-2.1-2.1-7.5 7.5-7.5-7.5-2.1 2.1 7.5 7.5-7.5 7.5ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 24q0-4.15 1.575-7.8 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24 4q4.15 0 7.8 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Z';
	Icons.folderUp = 'M22.5 34h3V23.75l3.7 3.7 2.1-2.1-7.3-7.3-7.3 7.3 2.1 2.1 3.7-3.7ZM7.05 40q-1.2 0-2.1-.925-.9-.925-.9-2.075V11q0-1.15.9-2.075Q5.85 8 7.05 8h14l3 3h17q1.15 0 2.075.925.925.925.925 2.075v23q0 1.15-.925 2.075Q42.2 40 41.05 40Zm0-29v26h34V14H22.8l-3-3H7.05Zm0 0v26Z';
	Icons.close = 'm12.45 37.65-2.1-2.1L21.9 24 10.35 12.45l2.1-2.1L24 21.9l11.55-11.55 2.1 2.1L26.1 24l11.55 11.55-2.1 2.1L24 26.1Z';
	Icons.options = 'm19.4 44-1-6.3q-.95-.35-2-.95t-1.85-1.25l-5.9 2.7L4 30l5.4-3.95q-.1-.45-.125-1.025Q9.25 24.45 9.25 24q0-.45.025-1.025T9.4 21.95L4 18l4.65-8.2 5.9 2.7q.8-.65 1.85-1.25t2-.9l1-6.35h9.2l1 6.3q.95.35 2.025.925Q32.7 11.8 33.45 12.5l5.9-2.7L44 18l-5.4 3.85q.1.5.125 1.075.025.575.025 1.075t-.025 1.05q-.025.55-.125 1.05L44 30l-4.65 8.2-5.9-2.7q-.8.65-1.825 1.275-1.025.625-2.025.925l-1 6.3ZM24 30.5q2.7 0 4.6-1.9 1.9-1.9 1.9-4.6 0-2.7-1.9-4.6-1.9-1.9-4.6-1.9-2.7 0-4.6 1.9-1.9 1.9-1.9 4.6 0 2.7 1.9 4.6 1.9 1.9 4.6 1.9Z';
	Icons.expand = 'm24 30.75-12-12 2.15-2.15L24 26.5l9.85-9.85L36 18.8Z';
	Icons.alert = 'M24 42q-1.45 0-2.475-1.025Q20.5 39.95 20.5 38.5q0-1.45 1.025-2.475Q22.55 35 24 35q1.45 0 2.475 1.025Q27.5 37.05 27.5 38.5q0 1.45-1.025 2.475Q25.45 42 24 42Zm-3.5-12V6h7v24Z';
	Icons.play = 'M14.75 40.15V7.55l25.6 16.3Z';
	Icons.stop = 'M10.75 37.25V10.7H37.3v26.55Z';
	Icons.folder = 'M7.05 40q-1.2 0-2.1-.925-.9-.925-.9-2.075V11q0-1.15.9-2.075Q5.85 8 7.05 8h14l3 3h17q1.15 0 2.075.925.925.925.925 2.075v23q0 1.15-.925 2.075Q42.2 40 41.05 40Z';

	class ObjectCloner {
	    static deepClone(instance) {
	        if (typeof window.structuredClone !== 'undefined') {
	            return window.structuredClone(instance);
	        }
	        return JSON.parse(JSON.stringify(instance));
	    }
	}

	class Uid {
	    static next() {
	        const bytes = new Uint8Array(16);
	        window.crypto.getRandomValues(bytes);
	        return Array.from(bytes, v => v.toString(16).padStart(2, '0')).join('');
	    }
	}

	function race(timeout, a, b, c) {
	    const value = [undefined, undefined, undefined];
	    const result = new SimpleEvent();
	    let scheduled = false;
	    function forward() {
	        if (scheduled) {
	            return;
	        }
	        scheduled = true;
	        setTimeout(() => {
	            try {
	                result.forward(value);
	            }
	            finally {
	                scheduled = false;
	                value.fill(undefined);
	            }
	        }, timeout);
	    }
	    [a, b, c]
	        .filter(e => e)
	        .forEach((e, index) => {
	        e.subscribe(v => {
	            value[index] = v;
	            forward();
	        });
	    });
	    return result;
	}

	class EditorRenderer {
	    static create(state, definitionWalker, handler) {
	        const listener = new EditorRenderer(state, definitionWalker, handler);
	        race(0, state.onDefinitionChanged, state.onSelectedStepIdChanged).subscribe(r => {
	            const [definitionChanged, selectedStepId] = r;
	            if (definitionChanged) {
	                listener.onDefinitionChanged(definitionChanged);
	            }
	            else if (selectedStepId !== undefined) {
	                listener.onSelectedStepIdChanged(selectedStepId);
	            }
	        });
	        listener.tryRender(state.selectedStepId);
	        return listener;
	    }
	    constructor(state, definitionWalker, handler) {
	        this.state = state;
	        this.definitionWalker = definitionWalker;
	        this.handler = handler;
	        this.currentStepId = undefined;
	    }
	    destroy() {
	        // TODO: unsubscribe from events
	    }
	    render(stepId) {
	        const step = stepId ? this.definitionWalker.getById(this.state.definition, stepId) : null;
	        this.currentStepId = stepId;
	        this.handler(step);
	    }
	    tryRender(stepId) {
	        if (this.currentStepId !== stepId) {
	            this.render(stepId);
	        }
	    }
	    onDefinitionChanged(event) {
	        if (event.changeType === exports.DefinitionChangeType.rootReplaced) {
	            this.render(this.state.selectedStepId);
	        }
	        else {
	            this.tryRender(this.state.selectedStepId);
	        }
	    }
	    onSelectedStepIdChanged(stepId) {
	        this.tryRender(stepId);
	    }
	}

	class EditorApi {
	    constructor(state, definitionWalker, definitionModifier) {
	        this.state = state;
	        this.definitionWalker = definitionWalker;
	        this.definitionModifier = definitionModifier;
	    }
	    isCollapsed() {
	        return this.state.isEditorCollapsed;
	    }
	    toggleIsCollapsed() {
	        this.state.setIsEditorCollapsed(!this.state.isEditorCollapsed);
	    }
	    subscribeIsCollapsed(listener) {
	        this.state.onIsEditorCollapsedChanged.subscribe(listener);
	    }
	    getDefinition() {
	        return this.state.definition;
	    }
	    runRenderer(rendererHandler) {
	        return EditorRenderer.create(this.state, this.definitionWalker, rendererHandler);
	    }
	    createStepEditorContext(stepId) {
	        if (!stepId) {
	            throw new Error('Step id is empty');
	        }
	        return {
	            notifyPropertiesChanged: () => {
	                this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepPropertyChanged, stepId);
	            },
	            notifyNameChanged: () => {
	                this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepNameChanged, stepId);
	            },
	            notifyChildrenChanged: () => {
	                this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepChildrenChanged, stepId);
	                this.definitionModifier.updateDependantFields();
	            }
	        };
	    }
	    createGlobalEditorContext() {
	        return {
	            notifyPropertiesChanged: () => {
	                this.state.notifyDefinitionChanged(exports.DefinitionChangeType.globalPropertyChanged, null);
	            }
	        };
	    }
	}

	class PathBarApi {
	    constructor(state, definitionWalker) {
	        this.state = state;
	        this.definitionWalker = definitionWalker;
	    }
	    /**
	     * @deprecated Don't use this method
	     */
	    subscribe(handler) {
	        // TODO: this should be refactored
	        race(0, this.state.onFolderPathChanged, this.state.onDefinitionChanged).subscribe(handler);
	    }
	    setFolderPath(path) {
	        this.state.setFolderPath(path);
	    }
	    getFolderPath() {
	        return this.state.folderPath;
	    }
	    getFolderPathStepNames() {
	        return this.state.folderPath.map(stepId => {
	            return this.definitionWalker.getById(this.state.definition, stepId).name;
	        });
	    }
	}

	class DragStepView {
	    static create(step, theme, componentContext) {
	        const layer = Dom.element('div', {
	            class: `sqd-drag sqd-theme-${theme}`
	        });
	        document.body.appendChild(layer);
	        const component = componentContext.services.draggedComponent.create(layer, step, componentContext);
	        return new DragStepView(component, layer);
	    }
	    constructor(component, layer) {
	        this.component = component;
	        this.layer = layer;
	    }
	    setPosition(position) {
	        this.layer.style.top = position.y + 'px';
	        this.layer.style.left = position.x + 'px';
	    }
	    remove() {
	        this.component.destroy();
	        document.body.removeChild(this.layer);
	    }
	}

	class PlaceholderFinder {
	    static create(placeholders, state) {
	        const checker = new PlaceholderFinder(placeholders, state);
	        state.onViewportChanged.subscribe(checker.clearCacheHandler);
	        window.addEventListener('scroll', checker.clearCacheHandler, false);
	        return checker;
	    }
	    constructor(placeholders, state) {
	        this.placeholders = placeholders;
	        this.state = state;
	        this.clearCacheHandler = () => this.clearCache();
	    }
	    find(vLt, vWidth, vHeight) {
	        var _a;
	        if (!this.cache) {
	            const scroll = new Vector(window.scrollX, window.scrollY);
	            this.cache = this.placeholders.map(placeholder => {
	                const rect = placeholder.getClientRect();
	                return {
	                    placeholder,
	                    lt: new Vector(rect.x, rect.y).add(scroll),
	                    br: new Vector(rect.x + rect.width, rect.y + rect.height).add(scroll)
	                };
	            });
	            this.cache.sort((a, b) => a.lt.y - b.lt.y);
	        }
	        const vR = vLt.x + vWidth;
	        const vB = vLt.y + vHeight;
	        return (_a = this.cache.find(p => {
	            return Math.max(vLt.x, p.lt.x) < Math.min(vR, p.br.x) && Math.max(vLt.y, p.lt.y) < Math.min(vB, p.br.y);
	        })) === null || _a === void 0 ? void 0 : _a.placeholder;
	    }
	    destroy() {
	        this.state.onViewportChanged.unsubscribe(this.clearCacheHandler);
	        window.removeEventListener('scroll', this.clearCacheHandler, false);
	    }
	    clearCache() {
	        this.cache = undefined;
	    }
	}

	class DragStepBehavior {
	    static create(designerContext, step, draggedStepComponent) {
	        const view = DragStepView.create(step, designerContext.theme, designerContext.componentContext);
	        return new DragStepBehavior(view, designerContext.workspaceController, designerContext.state, step, designerContext.definitionModifier, draggedStepComponent);
	    }
	    constructor(view, workspaceController, designerState, step, definitionModifier, draggedStepComponent) {
	        this.view = view;
	        this.workspaceController = workspaceController;
	        this.designerState = designerState;
	        this.step = step;
	        this.definitionModifier = definitionModifier;
	        this.draggedStepComponent = draggedStepComponent;
	    }
	    onStart(position) {
	        let offset = null;
	        if (this.draggedStepComponent) {
	            this.draggedStepComponent.setIsDisabled(true);
	            const hasSameSize = this.draggedStepComponent.view.width === this.view.component.width &&
	                this.draggedStepComponent.view.height === this.view.component.height;
	            if (hasSameSize) {
	                const scroll = new Vector(window.scrollX, window.scrollY);
	                // Mouse cursor will be positioned on the same place as the source component.
	                const pagePosition = this.draggedStepComponent.view.getClientPosition().add(scroll);
	                offset = position.subtract(pagePosition);
	            }
	        }
	        if (!offset) {
	            // Mouse cursor will be positioned in the center of the component.
	            offset = new Vector(this.view.component.width, this.view.component.height).divideByScalar(2);
	        }
	        this.view.setPosition(position.subtract(offset));
	        this.designerState.setIsDragging(true);
	        const placeholders = this.workspaceController.getPlaceholders();
	        this.state = {
	            startPosition: position,
	            finder: PlaceholderFinder.create(placeholders, this.designerState),
	            offset
	        };
	    }
	    onMove(delta) {
	        if (this.state) {
	            const newPosition = this.state.startPosition.subtract(delta).subtract(this.state.offset);
	            this.view.setPosition(newPosition);
	            const placeholder = this.state.finder.find(newPosition, this.view.component.width, this.view.component.height);
	            if (this.currentPlaceholder !== placeholder) {
	                if (this.currentPlaceholder) {
	                    this.currentPlaceholder.setIsHover(false);
	                }
	                if (placeholder) {
	                    placeholder.setIsHover(true);
	                }
	                this.currentPlaceholder = placeholder;
	            }
	        }
	    }
	    onEnd(interrupt) {
	        if (!this.state) {
	            throw new Error('Invalid state');
	        }
	        this.state.finder.destroy();
	        this.state = undefined;
	        this.view.remove();
	        this.designerState.setIsDragging(false);
	        let modified = false;
	        if (!interrupt && this.currentPlaceholder) {
	            if (this.draggedStepComponent) {
	                modified = this.definitionModifier.tryMove(this.draggedStepComponent.parentSequence, this.draggedStepComponent.step, this.currentPlaceholder.parentSequence, this.currentPlaceholder.index);
	            }
	            else {
	                modified = this.definitionModifier.tryInsert(this.step, this.currentPlaceholder.parentSequence, this.currentPlaceholder.index);
	            }
	        }
	        if (!modified) {
	            if (this.draggedStepComponent) {
	                this.draggedStepComponent.setIsDisabled(false);
	            }
	            if (this.currentPlaceholder) {
	                this.currentPlaceholder.setIsHover(false);
	            }
	        }
	        this.currentPlaceholder = undefined;
	    }
	}

	class ToolboxApi {
	    constructor(state, designerContext, behaviorController, iconProvider, configuration, uidGenerator) {
	        this.state = state;
	        this.designerContext = designerContext;
	        this.behaviorController = behaviorController;
	        this.iconProvider = iconProvider;
	        this.configuration = configuration;
	        this.uidGenerator = uidGenerator;
	    }
	    isCollapsed() {
	        return this.state.isToolboxCollapsed;
	    }
	    toggleIsCollapsed() {
	        this.state.setIsToolboxCollapsed(!this.state.isToolboxCollapsed);
	    }
	    subscribeIsCollapsed(listener) {
	        this.state.onIsToolboxCollapsedChanged.subscribe(listener);
	    }
	    tryGetIconUrl(step) {
	        return this.iconProvider.getIconUrl(step);
	    }
	    getLabel(step) {
	        const labelProvider = this.getConfiguration().labelProvider;
	        return labelProvider ? labelProvider(step) : step.name;
	    }
	    filterGroups(filter) {
	        return this.getConfiguration()
	            .groups.map(group => {
	            return {
	                name: group.name,
	                steps: group.steps.filter(s => {
	                    return filter ? s.name.toLowerCase().includes(filter) : true;
	                })
	            };
	        })
	            .filter(group => group.steps.length > 0);
	    }
	    /**
	     * @param position Mouse or touch position.
	     * @param step Step definition.
	     * @returns If started dragging returns true, otherwise returns false.
	     */
	    tryDrag(position, step) {
	        if (!this.state.isReadonly) {
	            const newStep = this.activateStep(step);
	            this.behaviorController.start(position, DragStepBehavior.create(this.designerContext, newStep));
	            return true;
	        }
	        return false;
	    }
	    activateStep(step) {
	        const newStep = ObjectCloner.deepClone(step);
	        newStep.id = this.uidGenerator ? this.uidGenerator() : Uid.next();
	        return newStep;
	    }
	    getConfiguration() {
	        if (!this.configuration) {
	            throw new Error('Toolbox is disabled');
	        }
	        return this.configuration;
	    }
	}

	class ViewportApi {
	    constructor(workspaceController, viewportController) {
	        this.workspaceController = workspaceController;
	        this.viewportController = viewportController;
	    }
	    resetViewport() {
	        this.viewportController.setDefault();
	    }
	    zoom(direction) {
	        this.viewportController.zoom(direction);
	    }
	    moveViewportToStep(stepId) {
	        const component = this.workspaceController.getComponentByStepId(stepId);
	        const componentPosition = component.view.getClientPosition();
	        const componentSize = new Vector(component.view.width, component.view.height);
	        this.viewportController.focusOnComponent(componentPosition, componentSize);
	    }
	}

	class WorkspaceApi {
	    constructor(state, workspaceController) {
	        this.state = state;
	        this.workspaceController = workspaceController;
	    }
	    getCanvasPosition() {
	        return this.workspaceController.getCanvasPosition();
	    }
	    getCanvasSize() {
	        return this.workspaceController.getCanvasSize();
	    }
	    getRootComponentSize() {
	        return this.workspaceController.getRootComponentSize();
	    }
	    getViewport() {
	        return this.state.viewport;
	    }
	    setViewport(viewport) {
	        this.state.setViewport(viewport);
	    }
	    updateRootComponent() {
	        this.workspaceController.updateRootComponent();
	    }
	    updateBadges() {
	        this.workspaceController.updateBadges();
	    }
	    updateCanvasSize() {
	        this.workspaceController.updateCanvasSize();
	    }
	}

	class DesignerApi {
	    static create(context) {
	        const workspace = new WorkspaceApi(context.state, context.workspaceController);
	        const viewportController = context.services.viewportController.create(workspace);
	        const viewport = new ViewportApi(context.workspaceController, viewportController);
	        return new DesignerApi(new ControlBarApi(context.state, context.historyController, context.definitionModifier, viewport), new ToolboxApi(context.state, context, context.behaviorController, context.componentContext.iconProvider, context.configuration.toolbox, context.configuration.uidGenerator), new EditorApi(context.state, context.definitionWalker, context.definitionModifier), workspace, viewport, new PathBarApi(context.state, context.definitionWalker));
	    }
	    constructor(controlBar, toolbox, editor, workspace, viewport, pathBar) {
	        this.controlBar = controlBar;
	        this.toolbox = toolbox;
	        this.editor = editor;
	        this.workspace = workspace;
	        this.viewport = viewport;
	        this.pathBar = pathBar;
	    }
	}

	class DefinitionValidator {
	    constructor(configuration, state) {
	        this.configuration = configuration;
	        this.state = state;
	    }
	    validateStep(step, parentSequence) {
	        var _a;
	        if ((_a = this.configuration) === null || _a === void 0 ? void 0 : _a.step) {
	            return this.configuration.step(step, parentSequence, this.state.definition);
	        }
	        return true;
	    }
	    validateRoot() {
	        var _a;
	        if ((_a = this.configuration) === null || _a === void 0 ? void 0 : _a.root) {
	            return this.configuration.root(this.state.definition);
	        }
	        return true;
	    }
	}

	class IconProvider {
	    constructor(configuration) {
	        this.configuration = configuration;
	    }
	    getIconUrl(step) {
	        if (this.configuration.iconUrlProvider) {
	            return this.configuration.iconUrlProvider(step.componentType, step.type);
	        }
	        return null;
	    }
	}

	const BADGE_GAP = 4;
	class Badges {
	    static createForStep(stepContext, view, componentContext) {
	        const g = createG(view.g);
	        const badges = componentContext.services.badges.map(ext => ext.createForStep(g, stepContext, componentContext));
	        const position = new Vector(view.width, 0);
	        return new Badges(g, position, badges);
	    }
	    static createForRoot(parentElement, position, componentContext) {
	        const g = createG(parentElement);
	        const badges = componentContext.services.badges.map(ext => {
	            return ext.createForRoot ? ext.createForRoot(g, componentContext) : null;
	        });
	        return new Badges(g, position, badges);
	    }
	    constructor(g, position, badges) {
	        this.g = g;
	        this.position = position;
	        this.badges = badges;
	    }
	    update(result) {
	        const count = this.badges.length;
	        for (let i = 0; i < count; i++) {
	            const badge = this.badges[i];
	            if (badge) {
	                result[i] = badge.update(result[i]);
	            }
	        }
	        let offsetX = 0;
	        let maxHeight = 0;
	        let j = 0;
	        for (let i = 0; i < count; i++) {
	            const badge = this.badges[i];
	            if (badge && badge.view) {
	                offsetX += j === 0 ? badge.view.width / 2 : badge.view.width;
	                maxHeight = Math.max(maxHeight, badge.view.height);
	                Dom.translate(badge.view.g, -offsetX, 0);
	                offsetX += BADGE_GAP;
	                j++;
	            }
	        }
	        Dom.translate(this.g, this.position.x, this.position.y + -maxHeight / 2);
	    }
	    resolveClick(click) {
	        for (const badge of this.badges) {
	            const command = badge && badge.resolveClick(click);
	            if (command) {
	                return command;
	            }
	        }
	        return null;
	    }
	}
	function createG(parentElement) {
	    const g = Dom.svg('g', {
	        class: 'sqd-badges'
	    });
	    parentElement.appendChild(g);
	    return g;
	}

	exports.ClickCommandType = void 0;
	(function (ClickCommandType) {
	    ClickCommandType[ClickCommandType["selectStep"] = 1] = "selectStep";
	    ClickCommandType[ClickCommandType["rerenderStep"] = 2] = "rerenderStep";
	    ClickCommandType[ClickCommandType["openFolder"] = 3] = "openFolder";
	    ClickCommandType[ClickCommandType["triggerCustomAction"] = 4] = "triggerCustomAction";
	})(exports.ClickCommandType || (exports.ClickCommandType = {}));
	exports.PlaceholderDirection = void 0;
	(function (PlaceholderDirection) {
	    PlaceholderDirection[PlaceholderDirection["none"] = 0] = "none";
	    PlaceholderDirection[PlaceholderDirection["in"] = 1] = "in";
	    PlaceholderDirection[PlaceholderDirection["out"] = 2] = "out";
	})(exports.PlaceholderDirection || (exports.PlaceholderDirection = {}));

	class StepComponent {
	    static create(view, stepContext, componentContext) {
	        const badges = Badges.createForStep(stepContext, view, componentContext);
	        return new StepComponent(view, stepContext.step, stepContext.parentSequence, view.hasOutput(), badges);
	    }
	    constructor(view, step, parentSequence, hasOutput, badges) {
	        this.view = view;
	        this.step = step;
	        this.parentSequence = parentSequence;
	        this.hasOutput = hasOutput;
	        this.badges = badges;
	        this.isDisabled = false;
	    }
	    findById(stepId) {
	        if (this.step.id === stepId) {
	            return this;
	        }
	        if (this.view.sequenceComponents) {
	            for (const component of this.view.sequenceComponents) {
	                const result = component.findById(stepId);
	                if (result) {
	                    return result;
	                }
	            }
	        }
	        return null;
	    }
	    resolveClick(click) {
	        if (this.view.sequenceComponents) {
	            for (const component of this.view.sequenceComponents) {
	                const result = component.resolveClick(click);
	                if (result) {
	                    return result;
	                }
	            }
	        }
	        const badgeResult = this.badges.resolveClick(click);
	        if (badgeResult) {
	            return badgeResult;
	        }
	        const viewResult = this.view.resolveClick(click);
	        if (viewResult) {
	            return viewResult === true
	                ? {
	                    type: exports.ClickCommandType.selectStep,
	                    component: this
	                }
	                : viewResult;
	        }
	        return null;
	    }
	    getPlaceholders(result) {
	        if (!this.isDisabled) {
	            if (this.view.sequenceComponents) {
	                this.view.sequenceComponents.forEach(component => component.getPlaceholders(result));
	            }
	            if (this.view.placeholders) {
	                this.view.placeholders.forEach(ph => result.push(ph));
	            }
	        }
	    }
	    setIsDragging(isDragging) {
	        if (!this.isDisabled) {
	            if (this.view.sequenceComponents) {
	                this.view.sequenceComponents.forEach(component => component.setIsDragging(isDragging));
	            }
	            if (this.view.placeholders) {
	                this.view.placeholders.forEach(ph => ph.setIsVisible(isDragging));
	            }
	        }
	        this.view.setIsDragging(isDragging);
	    }
	    setIsSelected(isSelected) {
	        this.view.setIsSelected(isSelected);
	    }
	    setIsDisabled(isDisabled) {
	        this.isDisabled = isDisabled;
	        this.view.setIsDisabled(isDisabled);
	    }
	    updateBadges(result) {
	        if (this.view.sequenceComponents) {
	            this.view.sequenceComponents.forEach(component => component.updateBadges(result));
	        }
	        this.badges.update(result);
	    }
	}

	class StepComponentViewContextFactory {
	    static create(stepContext, componentContext) {
	        return {
	            getStepIconUrl: () => componentContext.iconProvider.getIconUrl(stepContext.step),
	            createSequenceComponent: (parentElement, sequence) => {
	                const sequenceContext = {
	                    sequence,
	                    depth: stepContext.depth + 1,
	                    isInputConnected: true,
	                    isOutputConnected: stepContext.isOutputConnected
	                };
	                return componentContext.services.sequenceComponent.create(parentElement, sequenceContext, componentContext);
	            },
	            createPlaceholderForArea: componentContext.services.placeholder.createForArea.bind(componentContext.services.placeholder)
	        };
	    }
	}

	class StepComponentFactory {
	    constructor(stepExtensionResolver) {
	        this.stepExtensionResolver = stepExtensionResolver;
	    }
	    create(parentElement, stepContext, componentContext) {
	        const viewContext = StepComponentViewContextFactory.create(stepContext, componentContext);
	        const extension = this.stepExtensionResolver.resolve(stepContext.step.componentType);
	        const view = extension.createComponentView(parentElement, stepContext, viewContext);
	        const wrappedView = componentContext.services.stepComponentViewWrapper.wrap(view, stepContext);
	        return StepComponent.create(wrappedView, stepContext, componentContext);
	    }
	}

	class ComponentContext {
	    static create(stepsConfiguration, validatorConfiguration, state, stepExtensionResolver, services) {
	        const validator = new DefinitionValidator(validatorConfiguration, state);
	        const iconProvider = new IconProvider(stepsConfiguration);
	        const placeholderController = services.placeholderController.create();
	        const stepComponentFactory = new StepComponentFactory(stepExtensionResolver);
	        return new ComponentContext(validator, iconProvider, placeholderController, stepComponentFactory, services);
	    }
	    constructor(validator, iconProvider, placeholderController, stepComponentFactory, services) {
	        this.validator = validator;
	        this.iconProvider = iconProvider;
	        this.placeholderController = placeholderController;
	        this.stepComponentFactory = stepComponentFactory;
	        this.services = services;
	    }
	}

	class EditorView {
	    static create(parent) {
	        return new EditorView(parent);
	    }
	    constructor(parent) {
	        this.parent = parent;
	        this.currentContainer = null;
	    }
	    setContent(content, className) {
	        const container = Dom.element('div', {
	            class: className
	        });
	        container.appendChild(content);
	        if (this.currentContainer) {
	            this.parent.removeChild(this.currentContainer);
	        }
	        this.parent.appendChild(container);
	        this.currentContainer = container;
	    }
	    destroy() {
	        if (this.currentContainer) {
	            this.parent.removeChild(this.currentContainer);
	        }
	    }
	}

	class Editor {
	    static create(parent, api, stepEditorClassName, stepEditorProvider, globalEditorClassName, globalEditorProvider) {
	        const view = EditorView.create(parent);
	        function render(step) {
	            const definition = api.getDefinition();
	            let content;
	            let className;
	            if (step) {
	                const stepContext = api.createStepEditorContext(step.id);
	                content = stepEditorProvider(step, stepContext, definition);
	                className = stepEditorClassName;
	            }
	            else {
	                const globalContext = api.createGlobalEditorContext();
	                content = globalEditorProvider(definition, globalContext);
	                className = globalEditorClassName;
	            }
	            view.setContent(content, className);
	        }
	        const renderer = api.runRenderer(step => render(step));
	        return new Editor(view, renderer);
	    }
	    constructor(view, renderer) {
	        this.view = view;
	        this.renderer = renderer;
	    }
	    destroy() {
	        this.view.destroy();
	        this.renderer.destroy();
	    }
	}

	class ValidationErrorBadgeView {
	    static create(parent, cfg) {
	        const g = Dom.svg('g');
	        const halfOfSize = cfg.size / 2;
	        const circle = Dom.svg('path', {
	            class: 'sqd-validation-error',
	            d: `M 0 ${-halfOfSize} l ${halfOfSize} ${cfg.size} l ${-cfg.size} 0 Z`
	        });
	        Dom.translate(circle, halfOfSize, halfOfSize);
	        g.appendChild(circle);
	        const icon = Icons.appendPath(g, 'sqd-validation-error-icon-path', Icons.alert, cfg.iconSize);
	        const offsetX = (cfg.size - cfg.iconSize) * 0.5;
	        const offsetY = offsetX * 1.5;
	        Dom.translate(icon, offsetX, offsetY);
	        parent.appendChild(g);
	        return new ValidationErrorBadgeView(parent, g, cfg.size, cfg.size);
	    }
	    constructor(parent, g, width, height) {
	        this.parent = parent;
	        this.g = g;
	        this.width = width;
	        this.height = height;
	    }
	    destroy() {
	        this.parent.removeChild(this.g);
	    }
	}

	class ValidationErrorBadge {
	    static createForStep(parentElement, stepContext, componentContext, configuration) {
	        const validator = () => componentContext.validator.validateStep(stepContext.step, stepContext.parentSequence);
	        return new ValidationErrorBadge(parentElement, validator, configuration);
	    }
	    static createForRoot(parentElement, componentContext, configuration) {
	        const validator = () => componentContext.validator.validateRoot();
	        return new ValidationErrorBadge(parentElement, validator, configuration);
	    }
	    constructor(parentElement, validator, configuration) {
	        this.parentElement = parentElement;
	        this.validator = validator;
	        this.configuration = configuration;
	        this.view = null;
	    }
	    update(result) {
	        const isValid = this.validator();
	        if (isValid) {
	            if (this.view) {
	                this.view.destroy();
	                this.view = null;
	            }
	        }
	        else if (!this.view) {
	            this.view = ValidationErrorBadgeView.create(this.parentElement, this.configuration);
	        }
	        return isValid && result;
	    }
	    resolveClick() {
	        return null;
	    }
	}

	const defaultConfiguration$5 = {
	    view: {
	        size: 22,
	        iconSize: 12
	    }
	};
	class ValidationErrorBadgeExtension {
	    static create(configuration) {
	        return new ValidationErrorBadgeExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration$5);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	        this.id = 'validationError';
	        this.createStartValue = () => true;
	    }
	    createForStep(parentElement, stepContext, componentContext) {
	        return ValidationErrorBadge.createForStep(parentElement, stepContext, componentContext, this.configuration.view);
	    }
	    createForRoot(parentElement, componentContext) {
	        return ValidationErrorBadge.createForRoot(parentElement, componentContext, this.configuration.view);
	    }
	}

	class InputView {
	    static createRectInput(parent, x, y, size, iconSize, iconUrl) {
	        const g = Dom.svg('g');
	        parent.appendChild(g);
	        const rect = Dom.svg('rect', {
	            class: 'sqd-input',
	            width: size,
	            height: size,
	            x: x - size / 2,
	            y: y + size / -2 + 0.5,
	            rx: 4,
	            ry: 4
	        });
	        g.appendChild(rect);
	        if (iconUrl) {
	            const icon = Dom.svg('image', {
	                href: iconUrl,
	                width: iconSize,
	                height: iconSize,
	                x: x - iconSize / 2,
	                y: y + iconSize / -2
	            });
	            g.appendChild(icon);
	        }
	        return new InputView(g);
	    }
	    static createRoundInput(parent, x, y, size) {
	        const circle = Dom.svg('circle', {
	            class: 'sqd-input',
	            cx: x,
	            xy: y,
	            r: size / 2
	        });
	        parent.appendChild(circle);
	        return new InputView(circle);
	    }
	    constructor(root) {
	        this.root = root;
	    }
	    setIsHidden(isHidden) {
	        Dom.attrs(this.root, {
	            visibility: isHidden ? 'hidden' : 'visible'
	        });
	    }
	}

	class JoinView {
	    static createStraightJoin(parent, start, height) {
	        const join = Dom.svg('line', {
	            class: 'sqd-join',
	            x1: start.x,
	            y1: start.y,
	            x2: start.x,
	            y2: start.y + height
	        });
	        parent.insertBefore(join, parent.firstChild);
	    }
	    static createJoins(parent, start, targets) {
	        const firstTarget = targets[0];
	        const h = Math.abs(firstTarget.y - start.y) / 2; // half height
	        const y = Math.sign(firstTarget.y - start.y); // y direction
	        switch (targets.length) {
	            case 1:
	                if (start.x === targets[0].x) {
	                    JoinView.createStraightJoin(parent, start, firstTarget.y * y);
	                }
	                else {
	                    appendCurvedJoins(parent, start, targets, h, y);
	                }
	                break;
	            case 2:
	                appendCurvedJoins(parent, start, targets, h, y);
	                break;
	            default:
	                {
	                    const f = targets[0]; // first
	                    const l = targets[targets.length - 1]; // last
	                    appendJoin(parent, `M ${f.x} ${f.y} q ${h * 0.3} ${h * -y * 0.8} ${h} ${h * -y} ` +
	                        `l ${l.x - f.x - h * 2} 0 q ${h * 0.8} ${-h * -y * 0.3} ${h} ${-h * -y}`);
	                    for (let i = 1; i < targets.length - 1; i++) {
	                        JoinView.createStraightJoin(parent, targets[i], h * -y);
	                    }
	                    JoinView.createStraightJoin(parent, start, h * y);
	                }
	                break;
	        }
	    }
	}
	function appendCurvedJoins(parent, start, targets, h, y) {
	    for (const target of targets) {
	        const l = Math.abs(target.x - start.x) - h * 2; // line size
	        const x = Math.sign(target.x - start.x); // x direction
	        appendJoin(parent, `M ${start.x} ${start.y} q ${x * h * 0.3} ${y * h * 0.8} ${x * h} ${y * h} ` +
	            `l ${x * l} 0 q ${x * h * 0.7} ${y * h * 0.2} ${x * h} ${y * h}`);
	    }
	}
	function appendJoin(parent, d) {
	    const join = Dom.svg('path', {
	        class: 'sqd-join',
	        fill: 'none',
	        d
	    });
	    parent.insertBefore(join, parent.firstChild);
	}

	class LabelView {
	    static create(parent, y, cfg, text, theme) {
	        const g = Dom.svg('g', {
	            class: `sqd-label sqd-label-${theme}`
	        });
	        parent.appendChild(g);
	        const nameText = Dom.svg('text', {
	            class: 'sqd-label-text',
	            y: y + cfg.height / 2
	        });
	        nameText.textContent = text;
	        g.appendChild(nameText);
	        const width = Math.max(nameText.getBBox().width + cfg.paddingX * 2, cfg.minWidth);
	        const nameRect = Dom.svg('rect', {
	            class: 'sqd-label-rect',
	            width: width,
	            height: cfg.height,
	            x: -width / 2 + 0.5,
	            y: y + 0.5,
	            rx: cfg.radius,
	            ry: cfg.radius
	        });
	        g.insertBefore(nameRect, nameText);
	        return new LabelView(g, width, cfg.height);
	    }
	    constructor(g, width, height) {
	        this.g = g;
	        this.width = width;
	        this.height = height;
	    }
	}

	class OutputView {
	    static create(parent, x, y, size) {
	        const circle = Dom.svg('circle', {
	            class: 'sqd-output',
	            cx: x,
	            cy: y,
	            r: size / 2
	        });
	        parent.appendChild(circle);
	        return new OutputView(circle);
	    }
	    constructor(root) {
	        this.root = root;
	    }
	    setIsHidden(isHidden) {
	        Dom.attrs(this.root, {
	            visibility: isHidden ? 'hidden' : 'visible'
	        });
	    }
	}

	class RegionView {
	    static create(parent, widths, height) {
	        const totalWidth = widths.reduce((result, width) => result + width, 0);
	        const lines = [
	            drawLine(parent, 0, 0, totalWidth, 0),
	            drawLine(parent, 0, 0, 0, height),
	            drawLine(parent, 0, height, totalWidth, height),
	            drawLine(parent, totalWidth, 0, totalWidth, height)
	        ];
	        let offsetX = widths[0];
	        for (let i = 1; i < widths.length; i++) {
	            lines.push(drawLine(parent, offsetX, 0, offsetX, height));
	            offsetX += widths[i];
	        }
	        return new RegionView(lines, totalWidth, height);
	    }
	    constructor(lines, width, height) {
	        this.lines = lines;
	        this.width = width;
	        this.height = height;
	    }
	    getClientPosition() {
	        const rect = this.lines[0].getBoundingClientRect();
	        return new Vector(rect.x, rect.y);
	    }
	    resolveClick(click) {
	        const regionPosition = this.getClientPosition();
	        const d = click.position.subtract(regionPosition);
	        return d.x >= 0 && d.y >= 0 && d.x < this.width * click.scale && d.y < this.height * click.scale;
	    }
	    setIsSelected(isSelected) {
	        this.lines.forEach(region => {
	            Dom.toggleClass(region, isSelected, 'sqd-selected');
	        });
	    }
	}
	function drawLine(parent, x1, y1, x2, y2) {
	    const line = Dom.svg('line', {
	        class: 'sqd-region',
	        x1,
	        y1,
	        x2,
	        y2
	    });
	    parent.insertBefore(line, parent.firstChild);
	    return line;
	}

	class RectPlaceholderView {
	    static create(parent, width, height, radius, iconSize, direction) {
	        const g = Dom.svg('g', {
	            visibility: 'hidden',
	            class: 'sqd-placeholder'
	        });
	        parent.appendChild(g);
	        const rect = Dom.svg('rect', {
	            class: 'sqd-placeholder-rect',
	            width,
	            height,
	            rx: radius,
	            ry: radius
	        });
	        g.appendChild(rect);
	        if (direction) {
	            const iconD = direction === exports.PlaceholderDirection.in ? Icons.folderIn : Icons.folderOut;
	            const icon = Icons.appendPath(g, 'sqd-placeholder-icon-path', iconD, iconSize);
	            Dom.translate(icon, (width - iconSize) / 2, (height - iconSize) / 2);
	        }
	        parent.appendChild(g);
	        return new RectPlaceholderView(rect, g);
	    }
	    constructor(rect, g) {
	        this.rect = rect;
	        this.g = g;
	    }
	    setIsHover(isHover) {
	        Dom.toggleClass(this.g, isHover, 'sqd-hover');
	    }
	    setIsVisible(isVisible) {
	        Dom.attrs(this.g, {
	            visibility: isVisible ? 'visible' : 'hidden'
	        });
	    }
	}

	class DefaultSequenceComponentView {
	    static create(parent, sequenceContext, componentContext) {
	        const phWidth = componentContext.services.placeholder.gapSize.x;
	        const phHeight = componentContext.services.placeholder.gapSize.y;
	        const { sequence } = sequenceContext;
	        const g = Dom.svg('g');
	        parent.appendChild(g);
	        const components = [];
	        for (let index = 0; index < sequence.length; index++) {
	            const stepContext = {
	                parentSequence: sequenceContext.sequence,
	                step: sequence[index],
	                depth: sequenceContext.depth,
	                position: index,
	                isInputConnected: index === 0 ? sequenceContext.isInputConnected : components[index - 1].hasOutput,
	                isOutputConnected: index === sequence.length - 1 ? sequenceContext.isOutputConnected : true
	            };
	            components[index] = componentContext.stepComponentFactory.create(g, stepContext, componentContext);
	        }
	        let joinX;
	        let totalWidth;
	        if (components.length > 0) {
	            const restWidth = Math.max(...components.map(c => c.view.width - c.view.joinX));
	            joinX = Math.max(...components.map(c => c.view.joinX));
	            totalWidth = joinX + restWidth;
	        }
	        else {
	            joinX = phWidth / 2;
	            totalWidth = phWidth;
	        }
	        let offsetY = phHeight;
	        const placeholders = [];
	        for (let i = 0; i < components.length; i++) {
	            const component = components[i];
	            const offsetX = joinX - component.view.joinX;
	            if ((i === 0 && sequenceContext.isInputConnected) || (i > 0 && components[i - 1].hasOutput)) {
	                JoinView.createStraightJoin(g, new Vector(joinX, offsetY - phHeight), phHeight);
	            }
	            if (componentContext.placeholderController.canCreate(sequence, i)) {
	                const ph = componentContext.services.placeholder.createForGap(g, sequence, i);
	                Dom.translate(ph.view.g, joinX - phWidth / 2, offsetY - phHeight);
	                placeholders.push(ph);
	            }
	            Dom.translate(component.view.g, offsetX, offsetY);
	            offsetY += component.view.height + phHeight;
	        }
	        if (sequenceContext.isOutputConnected && (components.length === 0 || components[components.length - 1].hasOutput)) {
	            JoinView.createStraightJoin(g, new Vector(joinX, offsetY - phHeight), phHeight);
	        }
	        const newIndex = components.length;
	        if (componentContext.placeholderController.canCreate(sequence, newIndex)) {
	            const ph = componentContext.services.placeholder.createForGap(g, sequence, newIndex);
	            Dom.translate(ph.view.g, joinX - phWidth / 2, offsetY - phHeight);
	            placeholders.push(ph);
	        }
	        return new DefaultSequenceComponentView(g, totalWidth, offsetY, joinX, placeholders, components);
	    }
	    constructor(g, width, height, joinX, placeholders, components) {
	        this.g = g;
	        this.width = width;
	        this.height = height;
	        this.joinX = joinX;
	        this.placeholders = placeholders;
	        this.components = components;
	    }
	    setIsDragging(isDragging) {
	        this.placeholders.forEach(placeholder => {
	            placeholder.setIsVisible(isDragging);
	        });
	    }
	    hasOutput() {
	        if (this.components.length > 0) {
	            return this.components[this.components.length - 1].hasOutput;
	        }
	        return true;
	    }
	}

	class DefaultSequenceComponent {
	    static create(parentElement, sequenceContext, context) {
	        const view = DefaultSequenceComponentView.create(parentElement, sequenceContext, context);
	        return new DefaultSequenceComponent(view, view.hasOutput());
	    }
	    constructor(view, hasOutput) {
	        this.view = view;
	        this.hasOutput = hasOutput;
	    }
	    resolveClick(click) {
	        for (const component of this.view.components) {
	            const result = component.resolveClick(click);
	            if (result) {
	                return result;
	            }
	        }
	        for (const placeholder of this.view.placeholders) {
	            const result = placeholder.resolveClick(click);
	            if (result) {
	                return result;
	            }
	        }
	        return null;
	    }
	    findById(stepId) {
	        for (const component of this.view.components) {
	            const sc = component.findById(stepId);
	            if (sc) {
	                return sc;
	            }
	        }
	        return null;
	    }
	    getPlaceholders(result) {
	        this.view.placeholders.forEach(placeholder => result.push(placeholder));
	        this.view.components.forEach(c => c.getPlaceholders(result));
	    }
	    setIsDragging(isDragging) {
	        this.view.setIsDragging(isDragging);
	        this.view.components.forEach(c => c.setIsDragging(isDragging));
	    }
	    updateBadges(result) {
	        for (const component of this.view.components) {
	            component.updateBadges(result);
	        }
	    }
	}

	const createContainerStepComponentViewFactory = (cfg) => (parentElement, stepContext, viewContext) => {
	    const { step } = stepContext;
	    const g = Dom.svg('g', {
	        class: `sqd-step-container sqd-type-${step.type}`
	    });
	    parentElement.appendChild(g);
	    const labelView = LabelView.create(g, cfg.paddingTop, cfg.label, step.name, 'primary');
	    const sequenceComponent = viewContext.createSequenceComponent(g, step.sequence);
	    const halfOfWidestElement = labelView.width / 2;
	    const offsetLeft = Math.max(halfOfWidestElement - sequenceComponent.view.joinX, 0) + cfg.paddingX;
	    const offsetRight = Math.max(halfOfWidestElement - (sequenceComponent.view.width - sequenceComponent.view.joinX), 0) + cfg.paddingX;
	    const width = offsetLeft + sequenceComponent.view.width + offsetRight;
	    const height = cfg.paddingTop + cfg.label.height + sequenceComponent.view.height;
	    const joinX = sequenceComponent.view.joinX + offsetLeft;
	    Dom.translate(labelView.g, joinX, 0);
	    Dom.translate(sequenceComponent.view.g, offsetLeft, cfg.paddingTop + cfg.label.height);
	    const iconUrl = viewContext.getStepIconUrl();
	    const inputView = InputView.createRectInput(g, joinX, 0, cfg.inputSize, cfg.inputIconSize, iconUrl);
	    JoinView.createStraightJoin(g, new Vector(joinX, 0), cfg.paddingTop);
	    const regionView = RegionView.create(g, [width], height);
	    return {
	        g,
	        width,
	        height,
	        joinX,
	        placeholders: null,
	        sequenceComponents: [sequenceComponent],
	        getClientPosition() {
	            return regionView.getClientPosition();
	        },
	        resolveClick(click) {
	            return regionView.resolveClick(click) || g.contains(click.element) ? true : null;
	        },
	        setIsDragging(isDragging) {
	            inputView.setIsHidden(isDragging);
	        },
	        setIsSelected(isSelected) {
	            regionView.setIsSelected(isSelected);
	        },
	        setIsDisabled(isDisabled) {
	            Dom.toggleClass(g, isDisabled, 'sqd-disabled');
	        },
	        hasOutput() {
	            return sequenceComponent.hasOutput;
	        }
	    };
	};

	const createSwitchStepComponentViewFactory = (cfg) => (parent, stepContext, viewContext) => {
	    const { step } = stepContext;
	    const g = Dom.svg('g', {
	        class: `sqd-step-switch sqd-type-${step.type}`
	    });
	    parent.appendChild(g);
	    const branchNames = Object.keys(step.branches);
	    const branchComponents = branchNames.map(branchName => {
	        return viewContext.createSequenceComponent(g, step.branches[branchName]);
	    });
	    const branchLabelViews = branchNames.map(branchName => {
	        const labelY = cfg.paddingTop + cfg.nameLabel.height + cfg.connectionHeight;
	        return LabelView.create(g, labelY, cfg.branchNameLabel, branchName, 'secondary');
	    });
	    const nameLabelView = LabelView.create(g, cfg.paddingTop, cfg.nameLabel, step.name, 'primary');
	    let prevOffsetX = 0;
	    const branchSizes = branchComponents.map((component, i) => {
	        const halfOfWidestBranchElement = Math.max(branchLabelViews[i].width, cfg.minContainerWidth) / 2;
	        const branchOffsetLeft = Math.max(halfOfWidestBranchElement - component.view.joinX, 0) + cfg.paddingX;
	        const branchOffsetRight = Math.max(halfOfWidestBranchElement - (component.view.width - component.view.joinX), 0) + cfg.paddingX;
	        const width = component.view.width + branchOffsetLeft + branchOffsetRight;
	        const joinX = component.view.joinX + branchOffsetLeft;
	        const offsetX = prevOffsetX;
	        prevOffsetX += width;
	        return { width, branchOffsetLeft, offsetX, joinX };
	    });
	    const centerBranchIndex = Math.floor(branchNames.length / 2);
	    const centerBranchSize = branchSizes[centerBranchIndex];
	    let joinX = centerBranchSize.offsetX;
	    if (branchNames.length % 2 !== 0) {
	        joinX += centerBranchSize.joinX;
	    }
	    const totalBranchesWidth = branchSizes.reduce((result, s) => result + s.width, 0);
	    const maxBranchesHeight = Math.max(...branchComponents.map(s => s.view.height));
	    const halfOfWidestSwitchElement = nameLabelView.width / 2 + cfg.paddingX;
	    const switchOffsetLeft = Math.max(halfOfWidestSwitchElement - joinX, 0);
	    const switchOffsetRight = Math.max(halfOfWidestSwitchElement - (totalBranchesWidth - joinX), 0);
	    const viewWidth = switchOffsetLeft + totalBranchesWidth + switchOffsetRight;
	    const viewHeight = maxBranchesHeight + cfg.paddingTop + cfg.nameLabel.height + cfg.branchNameLabel.height + cfg.connectionHeight * 2;
	    const shiftedJoinX = switchOffsetLeft + joinX;
	    Dom.translate(nameLabelView.g, shiftedJoinX, 0);
	    const branchOffsetTop = cfg.paddingTop + cfg.nameLabel.height + cfg.branchNameLabel.height + cfg.connectionHeight;
	    branchComponents.forEach((component, i) => {
	        const branchSize = branchSizes[i];
	        const branchOffsetLeft = switchOffsetLeft + branchSize.offsetX + branchSize.branchOffsetLeft;
	        Dom.translate(branchLabelViews[i].g, switchOffsetLeft + branchSize.offsetX + branchSize.joinX, 0);
	        Dom.translate(component.view.g, branchOffsetLeft, branchOffsetTop);
	        if (component.hasOutput && stepContext.isOutputConnected) {
	            const endOffsetTopOfComponent = cfg.paddingTop + cfg.nameLabel.height + cfg.branchNameLabel.height + cfg.connectionHeight + component.view.height;
	            const missingHeight = viewHeight - endOffsetTopOfComponent - cfg.connectionHeight;
	            if (missingHeight > 0) {
	                JoinView.createStraightJoin(g, new Vector(switchOffsetLeft + branchSize.offsetX + branchSize.joinX, endOffsetTopOfComponent), missingHeight);
	            }
	        }
	    });
	    let inputView = null;
	    if (cfg.inputSize > 0) {
	        const iconUrl = viewContext.getStepIconUrl();
	        inputView = InputView.createRectInput(g, shiftedJoinX, 0, cfg.inputSize, cfg.inputIconSize, iconUrl);
	    }
	    JoinView.createStraightJoin(g, new Vector(shiftedJoinX, 0), cfg.paddingTop);
	    JoinView.createJoins(g, new Vector(shiftedJoinX, cfg.paddingTop + cfg.nameLabel.height), branchSizes.map(o => new Vector(switchOffsetLeft + o.offsetX + o.joinX, cfg.paddingTop + cfg.nameLabel.height + cfg.connectionHeight)));
	    if (stepContext.isOutputConnected) {
	        const ongoingSequenceIndexes = branchComponents
	            .map((component, index) => (component.hasOutput ? index : null))
	            .filter(index => index !== null);
	        const ongoingJoinTargets = ongoingSequenceIndexes.map((i) => new Vector(switchOffsetLeft + branchSizes[i].offsetX + branchSizes[i].joinX, cfg.paddingTop + cfg.connectionHeight + cfg.nameLabel.height + cfg.branchNameLabel.height + maxBranchesHeight));
	        if (ongoingJoinTargets.length > 0) {
	            JoinView.createJoins(g, new Vector(shiftedJoinX, viewHeight), ongoingJoinTargets);
	        }
	    }
	    const regions = branchSizes.map(s => s.width);
	    regions[0] += switchOffsetLeft;
	    regions[regions.length - 1] += switchOffsetRight;
	    const regionView = RegionView.create(g, regions, viewHeight);
	    return {
	        g,
	        width: viewWidth,
	        height: viewHeight,
	        joinX: shiftedJoinX,
	        placeholders: null,
	        sequenceComponents: branchComponents,
	        getClientPosition() {
	            return regionView.getClientPosition();
	        },
	        resolveClick(click) {
	            return regionView.resolveClick(click) || g.contains(click.element) ? true : null;
	        },
	        setIsDragging(isDragging) {
	            inputView === null || inputView === void 0 ? void 0 : inputView.setIsHidden(isDragging);
	        },
	        setIsSelected(isSelected) {
	            regionView.setIsSelected(isSelected);
	        },
	        setIsDisabled(isDisabled) {
	            Dom.toggleClass(g, isDisabled, 'sqd-disabled');
	        },
	        hasOutput() {
	            return branchComponents.some(c => c.hasOutput);
	        }
	    };
	};

	const createTaskStepComponentViewFactory = (isInterrupted, cfg) => (parentElement, stepContext, viewContext) => {
	    const { step } = stepContext;
	    const g = Dom.svg('g', {
	        class: `sqd-step-task sqd-type-${step.type}`
	    });
	    parentElement.appendChild(g);
	    const boxHeight = cfg.paddingY * 2 + cfg.iconSize;
	    const text = Dom.svg('text', {
	        x: cfg.paddingLeft + cfg.iconSize + cfg.textMarginLeft,
	        y: boxHeight / 2,
	        class: 'sqd-step-task-text'
	    });
	    text.textContent = step.name;
	    g.appendChild(text);
	    const textWidth = Math.max(text.getBBox().width, cfg.minTextWidth);
	    const boxWidth = cfg.iconSize + cfg.paddingLeft + cfg.paddingRight + cfg.textMarginLeft + textWidth;
	    const rect = Dom.svg('rect', {
	        x: 0.5,
	        y: 0.5,
	        class: 'sqd-step-task-rect',
	        width: boxWidth,
	        height: boxHeight,
	        rx: cfg.radius,
	        ry: cfg.radius
	    });
	    g.insertBefore(rect, text);
	    const iconUrl = viewContext.getStepIconUrl();
	    const icon = iconUrl
	        ? Dom.svg('image', {
	            href: iconUrl
	        })
	        : Dom.svg('rect', {
	            class: 'sqd-step-task-empty-icon',
	            rx: cfg.radius,
	            ry: cfg.radius
	        });
	    Dom.attrs(icon, {
	        x: cfg.paddingLeft,
	        y: cfg.paddingY,
	        width: cfg.iconSize,
	        height: cfg.iconSize
	    });
	    g.appendChild(icon);
	    const isInputViewHidden = stepContext.depth === 0 && stepContext.position === 0 && !stepContext.isInputConnected;
	    const isOutputViewHidden = isInterrupted;
	    const inputView = isInputViewHidden ? null : InputView.createRoundInput(g, boxWidth / 2, 0, cfg.inputSize);
	    const outputView = isOutputViewHidden ? null : OutputView.create(g, boxWidth / 2, boxHeight, cfg.outputSize);
	    return {
	        g,
	        width: boxWidth,
	        height: boxHeight,
	        joinX: boxWidth / 2,
	        sequenceComponents: null,
	        placeholders: null,
	        hasOutput() {
	            return !!outputView;
	        },
	        getClientPosition() {
	            const r = rect.getBoundingClientRect();
	            return new Vector(r.x, r.y);
	        },
	        resolveClick(click) {
	            return g.contains(click.element) ? true : null;
	        },
	        setIsDragging(isDragging) {
	            inputView === null || inputView === void 0 ? void 0 : inputView.setIsHidden(isDragging);
	            outputView === null || outputView === void 0 ? void 0 : outputView.setIsHidden(isDragging);
	        },
	        setIsDisabled(isDisabled) {
	            Dom.toggleClass(g, isDisabled, 'sqd-disabled');
	        },
	        setIsSelected(isSelected) {
	            Dom.toggleClass(rect, isSelected, 'sqd-selected');
	        }
	    };
	};

	class CenteredViewportCalculator {
	    static center(margin, canvasSize, rootComponentSize) {
	        const canvasSafeWidth = Math.max(canvasSize.x - margin * 2, 0);
	        const canvasSafeHeight = Math.max(canvasSize.y - margin * 2, 0);
	        const scale = Math.min(Math.min(canvasSafeWidth / rootComponentSize.x, canvasSafeHeight / rootComponentSize.y), 1);
	        const width = rootComponentSize.x * scale;
	        const height = rootComponentSize.y * scale;
	        const x = Math.max(0, (canvasSize.x - width) / 2);
	        const y = Math.max(0, (canvasSize.y - height) / 2);
	        return {
	            position: new Vector(x, y),
	            scale
	        };
	    }
	    static focusOnComponent(canvasSize, viewport, componentPosition, componentSize) {
	        const realPosition = viewport.position.divideByScalar(viewport.scale).subtract(componentPosition.divideByScalar(viewport.scale));
	        const componentOffset = componentSize.divideByScalar(2);
	        const position = realPosition.add(canvasSize.divideByScalar(2)).subtract(componentOffset);
	        return { position, scale: 1 };
	    }
	}

	class NextQuantifiedNumber {
	    constructor(values) {
	        this.values = values;
	    }
	    next(value, direction) {
	        let bestIndex = 0;
	        let bestDistance = Number.MAX_VALUE;
	        for (let i = 0; i < this.values.length; i++) {
	            const distance = Math.abs(this.values[i] - value);
	            if (bestDistance > distance) {
	                bestIndex = i;
	                bestDistance = distance;
	            }
	        }
	        let index;
	        if (direction) {
	            index = Math.min(bestIndex + 1, this.values.length - 1);
	        }
	        else {
	            index = Math.max(bestIndex - 1, 0);
	        }
	        return {
	            current: this.values[bestIndex],
	            next: this.values[index]
	        };
	    }
	}

	const SCALES = [0.06, 0.08, 0.1, 0.12, 0.16, 0.2, 0.26, 0.32, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
	const MAX_DELTA_Y = 16;
	const quantifiedScale = new NextQuantifiedNumber(SCALES);
	class QuantifiedScaleViewportCalculator {
	    static zoom(current, direction) {
	        const nextScale = quantifiedScale.next(current.scale, direction);
	        return {
	            position: current.position,
	            scale: nextScale.next
	        };
	    }
	    static zoomByWheel(current, e, canvasPosition) {
	        if (e.deltaY === 0) {
	            return null;
	        }
	        const nextScale = quantifiedScale.next(current.scale, e.deltaY < 0);
	        let scale;
	        const absDeltaY = Math.abs(e.deltaY);
	        if (absDeltaY < MAX_DELTA_Y) {
	            const fraction = absDeltaY / MAX_DELTA_Y;
	            const step = nextScale.next - nextScale.current;
	            scale = current.scale + step * fraction;
	        }
	        else {
	            scale = nextScale.next;
	        }
	        const mousePoint = new Vector(e.pageX, e.pageY).subtract(canvasPosition);
	        // The real point is point on canvas with no scale.
	        const mouseRealPoint = mousePoint.divideByScalar(current.scale).subtract(current.position.divideByScalar(current.scale));
	        const position = mouseRealPoint.multiplyByScalar(-scale).add(mousePoint);
	        return { position, scale };
	    }
	}

	class ClassicWheelController {
	    static create(api) {
	        return new ClassicWheelController(api);
	    }
	    constructor(api) {
	        this.api = api;
	    }
	    onWheel(e) {
	        const viewport = this.api.getViewport();
	        const canvasPosition = this.api.getCanvasPosition();
	        const newViewport = QuantifiedScaleViewportCalculator.zoomByWheel(viewport, e, canvasPosition);
	        if (newViewport) {
	            this.api.setViewport(newViewport);
	        }
	    }
	}

	class ClassicWheelControllerExtension {
	    constructor() {
	        this.create = ClassicWheelController.create;
	    }
	}

	function animate(interval, handler) {
	    const iv = setInterval(tick, 15);
	    const startTime = Date.now();
	    const anim = {
	        isAlive: true,
	        stop: () => {
	            anim.isAlive = false;
	            clearInterval(iv);
	        }
	    };
	    function tick() {
	        const progress = Math.min((Date.now() - startTime) / interval, 1);
	        handler(progress);
	        if (progress === 1) {
	            anim.stop();
	        }
	    }
	    return anim;
	}

	class ViewportAnimator {
	    constructor(api) {
	        this.api = api;
	    }
	    execute(target) {
	        if (this.animation && this.animation.isAlive) {
	            this.animation.stop();
	        }
	        const viewport = this.api.getViewport();
	        const startPosition = viewport.position;
	        const startScale = viewport.scale;
	        const deltaPosition = startPosition.subtract(target.position);
	        const deltaScale = startScale - target.scale;
	        this.animation = animate(150, progress => {
	            const newScale = startScale - deltaScale * progress;
	            this.api.setViewport({
	                position: startPosition.subtract(deltaPosition.multiplyByScalar(progress)),
	                scale: newScale
	            });
	        });
	    }
	}

	const CENTER_MARGIN = 10;
	class DefaultViewportController {
	    static create(api) {
	        return new DefaultViewportController(api);
	    }
	    constructor(api) {
	        this.api = api;
	        this.animator = new ViewportAnimator(this.api);
	    }
	    setDefault() {
	        const rootComponentSize = this.api.getRootComponentSize();
	        const canvasSize = this.api.getCanvasSize();
	        const target = CenteredViewportCalculator.center(CENTER_MARGIN, canvasSize, rootComponentSize);
	        this.api.setViewport(target);
	    }
	    zoom(direction) {
	        const viewport = this.api.getViewport();
	        const target = QuantifiedScaleViewportCalculator.zoom(viewport, direction);
	        this.api.setViewport(target);
	    }
	    focusOnComponent(componentPosition, componentSize) {
	        const viewport = this.api.getViewport();
	        const canvasSize = this.api.getCanvasSize();
	        const target = CenteredViewportCalculator.focusOnComponent(canvasSize, viewport, componentPosition, componentSize);
	        this.animateTo(target);
	    }
	    animateTo(viewport) {
	        this.animator.execute(viewport);
	    }
	}

	class DefaultViewportControllerExtension {
	    constructor() {
	        this.create = DefaultViewportController.create;
	    }
	}

	class StepExtensionResolver {
	    static create(services) {
	        const dict = {};
	        for (let i = services.steps.length - 1; i >= 0; i--) {
	            const extension = services.steps[i];
	            dict[extension.componentType] = extension;
	        }
	        return new StepExtensionResolver(dict);
	    }
	    constructor(dict) {
	        this.dict = dict;
	    }
	    resolve(componentType) {
	        const extension = this.dict[componentType];
	        if (!extension) {
	            throw new Error(`Not supported component type: ${componentType}`);
	        }
	        return extension;
	    }
	}

	class RectPlaceholder {
	    static create(parent, size, direction, sequence, index, configuration) {
	        const view = RectPlaceholderView.create(parent, size.x, size.y, configuration.radius, configuration.iconSize, direction);
	        return new RectPlaceholder(view, sequence, index);
	    }
	    constructor(view, parentSequence, index) {
	        this.view = view;
	        this.parentSequence = parentSequence;
	        this.index = index;
	    }
	    getClientRect() {
	        return this.view.rect.getBoundingClientRect();
	    }
	    setIsHover(isHover) {
	        this.view.setIsHover(isHover);
	    }
	    setIsVisible(isVisible) {
	        this.view.setIsVisible(isVisible);
	    }
	    resolveClick() {
	        return null;
	    }
	}

	const defaultResolvers = [sequentialResolver, branchedResolver];
	function branchedResolver(step) {
	    const branches = step.branches;
	    if (branches) {
	        return { type: exports.StepChildrenType.branches, items: branches };
	    }
	    return null;
	}
	function sequentialResolver(step) {
	    const sequence = step.sequence;
	    if (sequence) {
	        return { type: exports.StepChildrenType.sequence, items: sequence };
	    }
	    return null;
	}

	exports.StepChildrenType = void 0;
	(function (StepChildrenType) {
	    StepChildrenType[StepChildrenType["sequence"] = 1] = "sequence";
	    StepChildrenType[StepChildrenType["branches"] = 2] = "branches";
	})(exports.StepChildrenType || (exports.StepChildrenType = {}));
	class DefinitionWalker {
	    constructor(resolvers) {
	        this.resolvers = resolvers ? resolvers.concat(defaultResolvers) : defaultResolvers;
	    }
	    /**
	     * Returns children of the step. If the step doesn't have children, returns null.
	     * @param step The step.
	     */
	    getChildren(step) {
	        const count = this.resolvers.length;
	        for (let i = 0; i < count; i++) {
	            const result = this.resolvers[i](step);
	            if (result) {
	                return result;
	            }
	        }
	        return null;
	    }
	    /**
	     * Returns the parents of the step or the sequence.
	     * @param definition The definition.
	     * @param needle The step, stepId or sequence to find.
	     * @returns The parents of the step or the sequence.
	     */
	    getParents(definition, needle) {
	        const result = [];
	        let searchSequence = null;
	        let searchStepId = null;
	        if (Array.isArray(needle)) {
	            searchSequence = needle;
	        }
	        else if (typeof needle === 'string') {
	            searchStepId = needle;
	        }
	        else {
	            searchStepId = needle.id;
	        }
	        if (this.find(definition.sequence, searchSequence, searchStepId, result)) {
	            result.reverse();
	            return result.map(item => {
	                return typeof item === 'string' ? item : item.step;
	            });
	        }
	        throw new Error(searchStepId ? `Cannot get parents of step: ${searchStepId}` : 'Cannot get parents of sequence');
	    }
	    findParentSequence(definition, stepId) {
	        const result = [];
	        if (this.find(definition.sequence, null, stepId, result)) {
	            return result[0];
	        }
	        return null;
	    }
	    getParentSequence(definition, stepId) {
	        const result = this.findParentSequence(definition, stepId);
	        if (!result) {
	            throw new Error(`Cannot find step by id: ${stepId}`);
	        }
	        return result;
	    }
	    findById(definition, stepId) {
	        const result = this.findParentSequence(definition, stepId);
	        return result ? result.step : null;
	    }
	    getById(definition, stepId) {
	        return this.getParentSequence(definition, stepId).step;
	    }
	    forEach(definition, callback) {
	        this.iterateSequence(definition.sequence, callback);
	    }
	    forEachSequence(sequence, callback) {
	        this.iterateSequence(sequence, callback);
	    }
	    forEachChildren(step, callback) {
	        this.iterateStep(step, callback);
	    }
	    find(sequence, needSequence, needStepId, result) {
	        if (needSequence && sequence === needSequence) {
	            return true;
	        }
	        const count = sequence.length;
	        for (let index = 0; index < count; index++) {
	            const step = sequence[index];
	            if (needStepId && step.id === needStepId) {
	                result.push({ step, index, parentSequence: sequence });
	                return true;
	            }
	            const children = this.getChildren(step);
	            if (children) {
	                switch (children.type) {
	                    case exports.StepChildrenType.sequence:
	                        {
	                            const parentSequence = children.items;
	                            if (this.find(parentSequence, needSequence, needStepId, result)) {
	                                result.push({ step, index, parentSequence });
	                                return true;
	                            }
	                        }
	                        break;
	                    case exports.StepChildrenType.branches:
	                        {
	                            const branches = children.items;
	                            const branchNames = Object.keys(branches);
	                            for (const branchName of branchNames) {
	                                const parentSequence = branches[branchName];
	                                if (this.find(parentSequence, needSequence, needStepId, result)) {
	                                    result.push(branchName);
	                                    result.push({ step, index, parentSequence });
	                                    return true;
	                                }
	                            }
	                        }
	                        break;
	                    default:
	                        throw new Error(`Not supported step children type: ${children.type}`);
	                }
	            }
	        }
	        return false;
	    }
	    iterateSequence(sequence, callback) {
	        const count = sequence.length;
	        for (let index = 0; index < count; index++) {
	            const step = sequence[index];
	            if (callback(step, index, sequence) === false) {
	                return false;
	            }
	            if (!this.iterateStep(step, callback)) {
	                return false;
	            }
	        }
	        return true;
	    }
	    iterateStep(step, callback) {
	        const children = this.getChildren(step);
	        if (children) {
	            switch (children.type) {
	                case exports.StepChildrenType.sequence:
	                    {
	                        const sequence = children.items;
	                        if (!this.iterateSequence(sequence, callback)) {
	                            return false;
	                        }
	                    }
	                    break;
	                case exports.StepChildrenType.branches:
	                    {
	                        const sequences = Object.values(children.items);
	                        for (const sequence of sequences) {
	                            if (!this.iterateSequence(sequence, callback)) {
	                                return false;
	                            }
	                        }
	                    }
	                    break;
	                default:
	                    throw new Error(`Not supported step children type: ${children.type}`);
	            }
	        }
	        return true;
	    }
	}

	function readMousePosition(e) {
	    return new Vector(e.pageX, e.pageY);
	}
	function readTouchClientPosition(e) {
	    if (e.touches.length > 0) {
	        const touch = e.touches[0];
	        return new Vector(touch.clientX, touch.clientY);
	    }
	    throw new Error('Unknown touch position');
	}
	function readTouchPosition(e) {
	    if (e.touches.length > 0) {
	        const touch = e.touches[0];
	        return new Vector(touch.pageX, touch.pageY);
	    }
	    throw new Error('Unknown touch position');
	}

	const notInitializedError = 'State is not initialized';
	const nonPassiveOptions = {
	    passive: false
	};
	class BehaviorController {
	    constructor() {
	        this.onMouseMove = (e) => {
	            e.preventDefault();
	            this.move(readMousePosition(e));
	        };
	        this.onTouchMove = (e) => {
	            e.preventDefault();
	            this.move(readTouchPosition(e));
	        };
	        this.onMouseUp = (e) => {
	            e.preventDefault();
	            this.stop(false, e.target);
	        };
	        this.onTouchEnd = (e) => {
	            var _a;
	            e.preventDefault();
	            if (!this.state) {
	                throw new Error(notInitializedError);
	            }
	            const position = (_a = this.state.lastPosition) !== null && _a !== void 0 ? _a : this.state.startPosition;
	            const element = document.elementFromPoint(position.x, position.y);
	            this.stop(false, element);
	        };
	        this.onTouchStart = (e) => {
	            e.preventDefault();
	            if (e.touches.length !== 1) {
	                this.stop(true, null);
	            }
	        };
	    }
	    start(startPosition, behavior) {
	        if (this.state) {
	            this.stop(true, null);
	            return;
	        }
	        this.state = {
	            startPosition,
	            behavior
	        };
	        behavior.onStart(this.state.startPosition);
	        window.addEventListener('mousemove', this.onMouseMove, false);
	        window.addEventListener('touchmove', this.onTouchMove, nonPassiveOptions);
	        window.addEventListener('mouseup', this.onMouseUp, false);
	        window.addEventListener('touchend', this.onTouchEnd, nonPassiveOptions);
	        window.addEventListener('touchstart', this.onTouchStart, nonPassiveOptions);
	    }
	    move(position) {
	        if (!this.state) {
	            throw new Error(notInitializedError);
	        }
	        this.state.lastPosition = position;
	        const delta = this.state.startPosition.subtract(position);
	        const newBehavior = this.state.behavior.onMove(delta);
	        if (newBehavior) {
	            this.state.behavior.onEnd(true, null);
	            this.state.behavior = newBehavior;
	            this.state.startPosition = position;
	            this.state.behavior.onStart(this.state.startPosition);
	        }
	    }
	    stop(interrupt, element) {
	        if (!this.state) {
	            throw new Error(notInitializedError);
	        }
	        window.removeEventListener('mousemove', this.onMouseMove, false);
	        window.removeEventListener('touchmove', this.onTouchMove, nonPassiveOptions);
	        window.removeEventListener('mouseup', this.onMouseUp, false);
	        window.removeEventListener('touchend', this.onTouchEnd, nonPassiveOptions);
	        window.removeEventListener('touchstart', this.onTouchStart, nonPassiveOptions);
	        this.state.behavior.onEnd(interrupt, element);
	        this.state = undefined;
	    }
	}

	class SequenceModifier {
	    static tryMoveStep(sourceSequence, step, targetSequence, targetIndex) {
	        const sourceIndex = sourceSequence.indexOf(step);
	        if (sourceIndex < 0) {
	            throw new Error('Step not found in source sequence');
	        }
	        const isSameSequence = sourceSequence === targetSequence;
	        if (isSameSequence) {
	            if (sourceIndex < targetIndex) {
	                targetIndex--;
	            }
	            if (sourceIndex === targetIndex) {
	                return null; // No changes
	            }
	        }
	        return function apply() {
	            sourceSequence.splice(sourceIndex, 1);
	            targetSequence.splice(targetIndex, 0, step);
	        };
	    }
	    static insertStep(step, targetSequence, targetIndex) {
	        targetSequence.splice(targetIndex, 0, step);
	    }
	    static deleteStep(step, parentSequence) {
	        const index = parentSequence.indexOf(step);
	        if (index < 0) {
	            throw new Error('Unknown step');
	        }
	        parentSequence.splice(index, 1);
	    }
	}

	class StepDuplicator {
	    constructor(uidGenerator, definitionWalker) {
	        this.uidGenerator = uidGenerator;
	        this.definitionWalker = definitionWalker;
	    }
	    duplicate(step) {
	        const newStep = ObjectCloner.deepClone(step);
	        newStep.id = this.uidGenerator();
	        this.definitionWalker.forEachChildren(newStep, s => {
	            s.id = this.uidGenerator();
	        });
	        return newStep;
	    }
	}

	class DefinitionModifier {
	    constructor(definitionWalker, state, configuration) {
	        this.definitionWalker = definitionWalker;
	        this.state = state;
	        this.configuration = configuration;
	    }
	    isDeletable(stepId) {
	        if (this.configuration.steps.isDeletable) {
	            const result = this.definitionWalker.getParentSequence(this.state.definition, stepId);
	            return this.configuration.steps.isDeletable(result.step, result.parentSequence);
	        }
	        return true;
	    }
	    tryDelete(stepId) {
	        const result = this.definitionWalker.getParentSequence(this.state.definition, stepId);
	        const canDeleteStep = this.configuration.steps.canDeleteStep
	            ? this.configuration.steps.canDeleteStep(result.step, result.parentSequence)
	            : true;
	        if (!canDeleteStep) {
	            return false;
	        }
	        SequenceModifier.deleteStep(result.step, result.parentSequence);
	        this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepDeleted, result.step.id);
	        this.updateDependantFields();
	        return true;
	    }
	    tryInsert(step, targetSequence, targetIndex) {
	        const canInsertStep = this.configuration.steps.canInsertStep
	            ? this.configuration.steps.canInsertStep(step, targetSequence, targetIndex)
	            : true;
	        if (!canInsertStep) {
	            return false;
	        }
	        SequenceModifier.insertStep(step, targetSequence, targetIndex);
	        this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepInserted, step.id);
	        this.state.setSelectedStepId(step.id);
	        return true;
	    }
	    isDraggable(step, parentSequence) {
	        return this.configuration.steps.isDraggable ? this.configuration.steps.isDraggable(step, parentSequence) : true;
	    }
	    tryMove(sourceSequence, step, targetSequence, targetIndex) {
	        const apply = SequenceModifier.tryMoveStep(sourceSequence, step, targetSequence, targetIndex);
	        if (!apply) {
	            return false;
	        }
	        const canMoveStep = this.configuration.steps.canMoveStep
	            ? this.configuration.steps.canMoveStep(sourceSequence, step, targetSequence, targetIndex)
	            : true;
	        if (!canMoveStep) {
	            return false;
	        }
	        apply();
	        this.state.notifyDefinitionChanged(exports.DefinitionChangeType.stepMoved, step.id);
	        this.state.setSelectedStepId(step.id);
	        return true;
	    }
	    isDuplicable(step, parentSequence) {
	        return this.configuration.steps.isDuplicable ? this.configuration.steps.isDuplicable(step, parentSequence) : false;
	    }
	    tryDuplicate(step, parentSequence) {
	        const uidGenerator = this.configuration.uidGenerator ? this.configuration.uidGenerator : Uid.next;
	        const duplicator = new StepDuplicator(uidGenerator, this.definitionWalker);
	        const index = parentSequence.indexOf(step);
	        const newStep = duplicator.duplicate(step);
	        return this.tryInsert(newStep, parentSequence, index + 1);
	    }
	    replaceDefinition(definition) {
	        if (!definition) {
	            throw new Error('Definition is empty');
	        }
	        this.state.setDefinition(definition);
	        this.updateDependantFields();
	    }
	    updateDependantFields() {
	        if (this.state.selectedStepId) {
	            const found = this.definitionWalker.findById(this.state.definition, this.state.selectedStepId);
	            if (!found) {
	                // We need to unselect step when it's deleted.
	                this.state.setSelectedStepId(null);
	            }
	        }
	        for (let index = 0; index < this.state.folderPath.length; index++) {
	            const stepId = this.state.folderPath[index];
	            const found = this.definitionWalker.findById(this.state.definition, stepId);
	            if (!found) {
	                // We need to update path if any folder is deleted.
	                const newPath = this.state.folderPath.slice(0, index);
	                this.state.setFolderPath(newPath);
	                break;
	            }
	        }
	    }
	}

	class HistoryController {
	    static create(state, definitionModifier, configuration) {
	        if (!configuration.undoStackSize || configuration.undoStackSize < 1) {
	            throw new Error('Invalid undo stack size');
	        }
	        const controller = new HistoryController(state, definitionModifier, configuration.undoStackSize);
	        controller.remember(exports.DefinitionChangeType.rootReplaced, null);
	        state.onDefinitionChanged.subscribe(event => {
	            if (event.changeType !== exports.DefinitionChangeType.rootReplaced) {
	                controller.remember(event.changeType, event.stepId);
	            }
	        });
	        return controller;
	    }
	    constructor(state, definitionModifier, stackSize) {
	        this.state = state;
	        this.definitionModifier = definitionModifier;
	        this.stackSize = stackSize;
	        this.stack = [];
	        this.currentIndex = 0;
	    }
	    canUndo() {
	        return this.currentIndex > 1;
	    }
	    undo() {
	        this.currentIndex--;
	        this.commit();
	    }
	    canRedo() {
	        return this.currentIndex < this.stack.length;
	    }
	    redo() {
	        this.currentIndex++;
	        this.commit();
	    }
	    remember(changeType, stepId) {
	        const definition = ObjectCloner.deepClone(this.state.definition);
	        if (this.stack.length > 0 && this.currentIndex === this.stack.length) {
	            const lastItem = this.stack[this.stack.length - 1];
	            if (areItemsEqual(lastItem, changeType, stepId)) {
	                lastItem.definition = definition;
	                return;
	            }
	        }
	        this.stack.splice(this.currentIndex);
	        this.stack.push({
	            definition,
	            changeType,
	            stepId
	        });
	        if (this.stack.length > this.stackSize) {
	            this.stack.splice(0, this.stack.length - this.stackSize - 1);
	        }
	        this.currentIndex = this.stack.length;
	    }
	    commit() {
	        const definition = ObjectCloner.deepClone(this.stack[this.currentIndex - 1].definition);
	        this.definitionModifier.replaceDefinition(definition);
	    }
	}
	function areItemsEqual(item, changeType, stepId) {
	    return item.changeType === changeType && item.stepId === stepId;
	}

	class LayoutController {
	    constructor(parent) {
	        this.parent = parent;
	    }
	    isMobile() {
	        return this.parent.clientWidth < 400; // TODO
	    }
	}

	class WorkspaceControllerWrapper {
	    set(controller) {
	        if (this.controller) {
	            throw new Error('Controller is already set');
	        }
	        this.controller = controller;
	    }
	    get() {
	        if (!this.controller) {
	            throw new Error('Controller is not set');
	        }
	        return this.controller;
	    }
	    getPlaceholders() {
	        return this.get().getPlaceholders();
	    }
	    getComponentByStepId(stepId) {
	        return this.get().getComponentByStepId(stepId);
	    }
	    getCanvasPosition() {
	        return this.get().getCanvasPosition();
	    }
	    getCanvasSize() {
	        return this.get().getCanvasSize();
	    }
	    getRootComponentSize() {
	        return this.get().getRootComponentSize();
	    }
	    updateBadges() {
	        this.get().updateBadges();
	    }
	    updateRootComponent() {
	        this.get().updateRootComponent();
	    }
	    updateCanvasSize() {
	        this.get().updateCanvasSize();
	    }
	}

	class DesignerContext {
	    static create(parent, startDefinition, configuration, services) {
	        var _a, _b, _c;
	        const definition = ObjectCloner.deepClone(startDefinition);
	        const layoutController = new LayoutController(parent);
	        const isReadonly = !!configuration.isReadonly;
	        const isToolboxCollapsed = configuration.toolbox ? (_a = configuration.toolbox.isCollapsed) !== null && _a !== void 0 ? _a : layoutController.isMobile() : false;
	        const isEditorCollapsed = configuration.editors ? (_b = configuration.editors.isCollapsed) !== null && _b !== void 0 ? _b : layoutController.isMobile() : false;
	        const theme = configuration.theme || 'light';
	        const state = new DesignerState(definition, isReadonly, isToolboxCollapsed, isEditorCollapsed);
	        const workspaceController = new WorkspaceControllerWrapper();
	        const behaviorController = new BehaviorController();
	        const stepExtensionResolver = StepExtensionResolver.create(services);
	        const definitionWalker = (_c = configuration.definitionWalker) !== null && _c !== void 0 ? _c : new DefinitionWalker();
	        const definitionModifier = new DefinitionModifier(definitionWalker, state, configuration);
	        let historyController = undefined;
	        if (configuration.undoStackSize) {
	            historyController = HistoryController.create(state, definitionModifier, configuration);
	        }
	        const componentContext = ComponentContext.create(configuration.steps, configuration.validator, state, stepExtensionResolver, services);
	        return new DesignerContext(theme, state, configuration, services, componentContext, definitionWalker, definitionModifier, layoutController, workspaceController, behaviorController, historyController);
	    }
	    constructor(theme, state, configuration, services, componentContext, definitionWalker, definitionModifier, layoutController, workspaceController, behaviorController, historyController) {
	        this.theme = theme;
	        this.state = state;
	        this.configuration = configuration;
	        this.services = services;
	        this.componentContext = componentContext;
	        this.definitionWalker = definitionWalker;
	        this.definitionModifier = definitionModifier;
	        this.layoutController = layoutController;
	        this.workspaceController = workspaceController;
	        this.behaviorController = behaviorController;
	        this.historyController = historyController;
	    }
	    setWorkspaceController(controller) {
	        this.workspaceController.set(controller);
	    }
	}

	function isElementAttached(element) {
	    return !(document.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_DISCONNECTED);
	}

	let lastGridPatternId = 0;
	class WorkspaceView {
	    static create(parent, componentContext) {
	        const patternId = 'sqd-grid-pattern-' + lastGridPatternId++;
	        const pattern = Dom.svg('pattern', {
	            id: patternId,
	            patternUnits: 'userSpaceOnUse'
	        });
	        const gridPattern = componentContext.services.grid.create();
	        const defs = Dom.svg('defs');
	        pattern.appendChild(gridPattern.element);
	        defs.appendChild(pattern);
	        const foreground = Dom.svg('g');
	        const workspace = Dom.element('div', {
	            class: 'sqd-workspace'
	        });
	        const canvas = Dom.svg('svg', {
	            class: 'sqd-workspace-canvas'
	        });
	        canvas.appendChild(defs);
	        canvas.appendChild(Dom.svg('rect', {
	            width: '100%',
	            height: '100%',
	            fill: `url(#${patternId})`
	        }));
	        canvas.appendChild(foreground);
	        workspace.appendChild(canvas);
	        parent.appendChild(workspace);
	        const view = new WorkspaceView(workspace, canvas, pattern, gridPattern, foreground, componentContext);
	        window.addEventListener('resize', view.onResizeHandler, false);
	        return view;
	    }
	    constructor(workspace, canvas, pattern, gridPattern, foreground, context) {
	        this.workspace = workspace;
	        this.canvas = canvas;
	        this.pattern = pattern;
	        this.gridPattern = gridPattern;
	        this.foreground = foreground;
	        this.context = context;
	        this.onResizeHandler = () => this.onResize();
	    }
	    render(sequence, parentSequencePlaceIndicator) {
	        if (this.rootComponent) {
	            this.foreground.removeChild(this.rootComponent.view.g);
	        }
	        this.rootComponent = this.context.services.rootComponent.create(this.foreground, sequence, parentSequencePlaceIndicator, this.context);
	        this.refreshSize();
	    }
	    setPositionAndScale(position, scale) {
	        const scaledSize = this.gridPattern.size.multiplyByScalar(scale);
	        Dom.attrs(this.pattern, {
	            x: position.x,
	            y: position.y,
	            width: scaledSize.x,
	            height: scaledSize.y
	        });
	        this.gridPattern.setScale(scale, scaledSize);
	        Dom.attrs(this.foreground, {
	            transform: `translate(${position.x}, ${position.y}) scale(${scale})`
	        });
	    }
	    getCanvasPosition() {
	        const rect = this.canvas.getBoundingClientRect();
	        return new Vector(rect.x + window.scrollX, rect.y + window.scrollY);
	    }
	    getCanvasSize() {
	        return new Vector(this.canvas.clientWidth, this.canvas.clientHeight);
	    }
	    bindClick(handler) {
	        this.canvas.addEventListener('mousedown', e => {
	            e.preventDefault();
	            handler(readMousePosition(e), e.target, e.button);
	        }, false);
	        this.canvas.addEventListener('touchstart', e => {
	            e.preventDefault();
	            const clientPosition = readTouchClientPosition(e);
	            const element = document.elementFromPoint(clientPosition.x, clientPosition.y);
	            if (element) {
	                const position = readTouchPosition(e);
	                handler(position, element, 0);
	            }
	        }, { passive: false });
	    }
	    bindContextMenu(handler) {
	        this.canvas.addEventListener('contextmenu', e => {
	            e.preventDefault();
	            handler(readMousePosition(e), e.target);
	        }, false);
	    }
	    bindWheel(handler) {
	        this.canvas.addEventListener('wheel', handler, false);
	    }
	    destroy() {
	        window.removeEventListener('resize', this.onResizeHandler, false);
	    }
	    refreshSize() {
	        Dom.attrs(this.canvas, {
	            width: this.workspace.offsetWidth,
	            height: this.workspace.offsetHeight
	        });
	    }
	    onResize() {
	        this.refreshSize();
	    }
	}

	class MoveViewportBehavior {
	    static create(state, resetSelectedStep) {
	        return new MoveViewportBehavior(state.viewport.position, resetSelectedStep, state);
	    }
	    constructor(startPosition, resetSelectedStep, state) {
	        this.startPosition = startPosition;
	        this.resetSelectedStep = resetSelectedStep;
	        this.state = state;
	    }
	    onStart() {
	        if (this.resetSelectedStep) {
	            const stepId = this.state.tryGetLastStepIdFromFolderPath();
	            this.state.setSelectedStepId(stepId);
	        }
	    }
	    onMove(delta) {
	        this.state.setViewport({
	            position: this.startPosition.subtract(delta),
	            scale: this.state.viewport.scale
	        });
	    }
	    onEnd() {
	        // Nothing to do.
	    }
	}

	class SelectStepBehavior {
	    static create(pressedStepComponent, forceDisableDrag, context) {
	        const isDragDisabled = forceDisableDrag ||
	            context.state.isDragDisabled ||
	            !context.definitionModifier.isDraggable(pressedStepComponent.step, pressedStepComponent.parentSequence);
	        return new SelectStepBehavior(pressedStepComponent, isDragDisabled, context, context.state);
	    }
	    constructor(pressedStepComponent, isDragDisabled, context, state) {
	        this.pressedStepComponent = pressedStepComponent;
	        this.isDragDisabled = isDragDisabled;
	        this.context = context;
	        this.state = state;
	    }
	    onStart() {
	        // Nothing to do.
	    }
	    onMove(delta) {
	        if (delta.distance() > 2) {
	            const canDrag = !this.state.isReadonly && !this.isDragDisabled;
	            if (canDrag) {
	                this.state.setSelectedStepId(null);
	                return DragStepBehavior.create(this.context, this.pressedStepComponent.step, this.pressedStepComponent);
	            }
	            else {
	                return MoveViewportBehavior.create(this.state, false);
	            }
	        }
	    }
	    onEnd(interrupt) {
	        if (!interrupt) {
	            this.state.setSelectedStepId(this.pressedStepComponent.step.id);
	        }
	    }
	}

	class PressingBehavior {
	    static create(clickedElement, handler) {
	        return new PressingBehavior(clickedElement, handler);
	    }
	    constructor(clickedElement, handler) {
	        this.clickedElement = clickedElement;
	        this.handler = handler;
	    }
	    onStart() {
	        // Nothing...
	    }
	    onMove() {
	        // Nothing...
	    }
	    onEnd(interrupt, element) {
	        if (!interrupt && element && this.clickedElement === element) {
	            this.handler.handle();
	        }
	    }
	}

	class RerenderStepPressingBehaviorHandler {
	    constructor(designerContext) {
	        this.designerContext = designerContext;
	    }
	    handle() {
	        this.designerContext.workspaceController.updateRootComponent();
	    }
	}

	class OpenFolderPressingBehaviorHandler {
	    constructor(command, designerContext) {
	        this.command = command;
	        this.designerContext = designerContext;
	    }
	    handle() {
	        const stepId = this.command.step.id;
	        this.designerContext.state.pushStepIdToFolderPath(stepId);
	    }
	}

	class TriggerCustomActionPressingBehaviorHandler {
	    constructor(command, designerContext) {
	        this.command = command;
	        this.designerContext = designerContext;
	    }
	    handle() {
	        const customActionHandler = this.designerContext.configuration.customActionHandler;
	        if (!customActionHandler) {
	            console.warn(`Custom action handler is not defined (action type: ${this.command.action.type})`);
	            return;
	        }
	        const context = this.createContext();
	        customActionHandler(this.command.action, this.command.step, this.command.sequence, context);
	    }
	    createContext() {
	        return {
	            notifyStepNameChanged: (stepId) => this.notifyStepChanged(exports.DefinitionChangeType.stepNameChanged, stepId),
	            notifyStepPropertiesChanged: (stepId) => this.notifyStepChanged(exports.DefinitionChangeType.stepPropertyChanged, stepId),
	            notifyStepInserted: (stepId) => this.notifyStepChanged(exports.DefinitionChangeType.stepInserted, stepId),
	            notifyStepMoved: (stepId) => this.notifyStepChanged(exports.DefinitionChangeType.stepMoved, stepId),
	            notifyStepDeleted: (stepId) => this.notifyStepChanged(exports.DefinitionChangeType.stepDeleted, stepId)
	        };
	    }
	    notifyStepChanged(changeType, stepId) {
	        if (!stepId) {
	            throw new Error('Step id is empty');
	        }
	        this.designerContext.state.notifyDefinitionChanged(changeType, stepId);
	    }
	}

	class ClickBehaviorResolver {
	    constructor(designerContext, state) {
	        this.designerContext = designerContext;
	        this.state = state;
	    }
	    resolve(commandOrNull, element, forceDisableDrag) {
	        if (!commandOrNull) {
	            return MoveViewportBehavior.create(this.state, true);
	        }
	        switch (commandOrNull.type) {
	            case exports.ClickCommandType.selectStep:
	                return SelectStepBehavior.create(commandOrNull.component, forceDisableDrag, this.designerContext);
	            case exports.ClickCommandType.rerenderStep:
	                return PressingBehavior.create(element, new RerenderStepPressingBehaviorHandler(this.designerContext));
	            case exports.ClickCommandType.openFolder:
	                return PressingBehavior.create(element, new OpenFolderPressingBehaviorHandler(commandOrNull, this.designerContext));
	            case exports.ClickCommandType.triggerCustomAction:
	                return PressingBehavior.create(element, new TriggerCustomActionPressingBehaviorHandler(commandOrNull, this.designerContext));
	            default:
	                throw new Error('Not supported behavior type');
	        }
	    }
	}

	class BadgesResultFactory {
	    static create(services) {
	        return services.badges.map(ext => ext.createStartValue());
	    }
	}

	function findValidationBadgeIndex(extensions) {
	    return extensions.findIndex(ext => ext.id === 'validationError');
	}

	class ContextMenu {
	    static create(position, theme, items) {
	        const menu = document.createElement('div');
	        menu.style.left = `${position.x}px`;
	        menu.style.top = `${position.y}px`;
	        menu.className = `sqd-context-menu sqd-theme-${theme}`;
	        const elements = [];
	        for (let index = 0; index < items.length; index++) {
	            const item = items[index];
	            const element = document.createElement('div');
	            if (typeof item === 'string') {
	                element.className = 'sqd-context-menu-group';
	                element.innerText = item;
	            }
	            else {
	                element.className = 'sqd-context-menu-item';
	                element.innerText = item.label;
	            }
	            elements.push(element);
	            menu.appendChild(element);
	        }
	        const instance = new ContextMenu(menu, elements, items, Date.now());
	        document.addEventListener('mousedown', instance.mouseDown, false);
	        document.addEventListener('mouseup', instance.mouseUp, false);
	        document.addEventListener('touchstart', instance.mouseDown, false);
	        document.addEventListener('touchend', instance.mouseUp, false);
	        document.body.appendChild(menu);
	        return instance;
	    }
	    constructor(menu, elements, items, startTime) {
	        this.menu = menu;
	        this.elements = elements;
	        this.items = items;
	        this.startTime = startTime;
	        this.isAttached = true;
	        this.mouseDown = (e) => {
	            const index = this.findIndex(e.target);
	            if (index === null) {
	                this.tryDestroy();
	            }
	            else {
	                e.preventDefault();
	                e.stopPropagation();
	            }
	        };
	        this.mouseUp = (e) => {
	            const dt = Date.now() - this.startTime;
	            if (dt < 300) {
	                e.preventDefault();
	                e.stopPropagation();
	                return;
	            }
	            try {
	                const index = this.findIndex(e.target);
	                if (index !== null) {
	                    const item = this.items[index];
	                    if (typeof item !== 'string') {
	                        item.callback();
	                    }
	                }
	            }
	            finally {
	                this.tryDestroy();
	            }
	        };
	    }
	    findIndex(element) {
	        for (let index = 0; index < this.elements.length; index++) {
	            if (this.elements[index].contains(element)) {
	                return index;
	            }
	        }
	        return null;
	    }
	    tryDestroy() {
	        if (this.isAttached) {
	            document.body.removeChild(this.menu);
	            document.removeEventListener('mousedown', this.mouseDown, false);
	            document.removeEventListener('mouseup', this.mouseUp, false);
	            document.removeEventListener('touchstart', this.mouseDown, false);
	            document.removeEventListener('touchend', this.mouseUp, false);
	            this.isAttached = false;
	        }
	    }
	}

	class ContextMenuItemsBuilder {
	    static build(commandOrNull, viewportApi, definitionModifier, state) {
	        const items = [];
	        if (commandOrNull && commandOrNull.type === exports.ClickCommandType.selectStep) {
	            const ssc = commandOrNull;
	            const step = ssc.component.step;
	            const parentSequence = ssc.component.parentSequence;
	            items.push(step.name);
	            if (state.selectedStepId === step.id) {
	                items.push({
	                    label: `Unselect`,
	                    callback: () => {
	                        state.setSelectedStepId(null);
	                    }
	                });
	            }
	            else {
	                items.push({
	                    label: 'Select',
	                    callback: () => {
	                        state.setSelectedStepId(step.id);
	                    }
	                });
	            }
	            if (!state.isReadonly) {
	                if (definitionModifier.isDeletable(step.id)) {
	                    items.push({
	                        label: 'Delete',
	                        callback: () => {
	                            definitionModifier.tryDelete(step.id);
	                        }
	                    });
	                }
	                if (definitionModifier.isDuplicable(step, parentSequence)) {
	                    items.push({
	                        label: 'Duplicate',
	                        callback: () => {
	                            definitionModifier.tryDuplicate(step, parentSequence);
	                        }
	                    });
	                }
	            }
	        }
	        items.push({
	            label: 'Reset view',
	            callback: () => {
	                viewportApi.resetViewport();
	            }
	        });
	        return items;
	    }
	}

	class ContextMenuController {
	    constructor(theme, viewportApi, definitionModifier, state, configuration) {
	        this.theme = theme;
	        this.viewportApi = viewportApi;
	        this.definitionModifier = definitionModifier;
	        this.state = state;
	        this.configuration = configuration;
	    }
	    tryOpen(position, commandOrNull) {
	        if (this.configuration.contextMenu === false) {
	            // Context menu is disabled.
	            return;
	        }
	        if (this.last) {
	            this.last.tryDestroy();
	        }
	        const items = ContextMenuItemsBuilder.build(commandOrNull, this.viewportApi, this.definitionModifier, this.state);
	        this.last = ContextMenu.create(position, this.theme, items);
	    }
	    destroy() {
	        if (this.last) {
	            this.last.tryDestroy();
	        }
	    }
	}

	class Workspace {
	    static create(parent, designerContext, api) {
	        const view = WorkspaceView.create(parent, designerContext.componentContext);
	        const clickBehaviorResolver = new ClickBehaviorResolver(designerContext, designerContext.state);
	        const wheelController = designerContext.services.wheelController.create(api.workspace);
	        const contextMenuController = new ContextMenuController(designerContext.theme, api.viewport, designerContext.definitionModifier, designerContext.state, designerContext.configuration);
	        const workspace = new Workspace(view, designerContext.definitionWalker, designerContext.state, designerContext.behaviorController, wheelController, contextMenuController, clickBehaviorResolver, api.viewport, designerContext.services);
	        setTimeout(() => {
	            workspace.updateRootComponent();
	            api.viewport.resetViewport();
	            workspace.onReady.forward();
	        });
	        designerContext.setWorkspaceController(workspace);
	        designerContext.state.onViewportChanged.subscribe(vp => workspace.onViewportChanged(vp));
	        designerContext.state.onIsDraggingChanged.subscribe(is => workspace.onIsDraggingChanged(is));
	        race(0, designerContext.state.onDefinitionChanged, designerContext.state.onSelectedStepIdChanged, designerContext.state.onFolderPathChanged).subscribe(r => {
	            workspace.onStateChanged(r[0], r[1], r[2]);
	        });
	        view.bindClick((p, t, b) => workspace.onClick(p, t, b));
	        view.bindWheel(e => workspace.onWheel(e));
	        view.bindContextMenu((p, t) => workspace.onContextMenu(p, t));
	        return workspace;
	    }
	    constructor(view, definitionWalker, state, behaviorController, wheelController, contextMenuController, clickBehaviorResolver, viewportApi, services) {
	        this.view = view;
	        this.definitionWalker = definitionWalker;
	        this.state = state;
	        this.behaviorController = behaviorController;
	        this.wheelController = wheelController;
	        this.contextMenuController = contextMenuController;
	        this.clickBehaviorResolver = clickBehaviorResolver;
	        this.viewportApi = viewportApi;
	        this.services = services;
	        this.onReady = new SimpleEvent();
	        this.isValid = false;
	        this.selectedStepComponent = null;
	        this.validationErrorBadgeIndex = null;
	    }
	    updateRootComponent() {
	        this.selectedStepComponent = null;
	        let parentSequencePlaceIndicator;
	        let sequence;
	        const stepId = this.state.tryGetLastStepIdFromFolderPath();
	        if (stepId) {
	            const parentSequence = this.definitionWalker.getParentSequence(this.state.definition, stepId);
	            const children = this.definitionWalker.getChildren(parentSequence.step);
	            if (!children || children.type !== exports.StepChildrenType.sequence) {
	                throw new Error('Cannot find single sequence in folder step');
	            }
	            sequence = children.items;
	            parentSequencePlaceIndicator = {
	                sequence: parentSequence.parentSequence,
	                index: parentSequence.index
	            };
	        }
	        else {
	            sequence = this.state.definition.sequence;
	            parentSequencePlaceIndicator = null;
	        }
	        this.view.render(sequence, parentSequencePlaceIndicator);
	        this.trySelectStepComponent(this.state.selectedStepId);
	        this.updateBadges();
	    }
	    updateBadges() {
	        const result = BadgesResultFactory.create(this.services);
	        this.getRootComponent().updateBadges(result);
	        if (this.validationErrorBadgeIndex === null) {
	            this.validationErrorBadgeIndex = findValidationBadgeIndex(this.services.badges);
	        }
	        this.isValid = Boolean(result[this.validationErrorBadgeIndex]);
	    }
	    getPlaceholders() {
	        const result = [];
	        this.getRootComponent().getPlaceholders(result);
	        return result;
	    }
	    getComponentByStepId(stepId) {
	        const component = this.getRootComponent().findById(stepId);
	        if (!component) {
	            throw new Error(`Cannot find component for step id: ${stepId}`);
	        }
	        return component;
	    }
	    getCanvasPosition() {
	        return this.view.getCanvasPosition();
	    }
	    getCanvasSize() {
	        return this.view.getCanvasSize();
	    }
	    getRootComponentSize() {
	        const view = this.getRootComponent().view;
	        return new Vector(view.width, view.height);
	    }
	    updateCanvasSize() {
	        setTimeout(() => this.view.refreshSize());
	    }
	    destroy() {
	        this.contextMenuController.destroy();
	        this.view.destroy();
	    }
	    onClick(position, target, buttonIndex) {
	        const isPrimaryButton = buttonIndex === 0;
	        const isMiddleButton = buttonIndex === 1;
	        if (isPrimaryButton || isMiddleButton) {
	            const commandOrNull = this.resolveClick(target, position);
	            const forceDisableDrag = isMiddleButton;
	            const behavior = this.clickBehaviorResolver.resolve(commandOrNull, target, forceDisableDrag);
	            this.behaviorController.start(position, behavior);
	        }
	    }
	    onWheel(e) {
	        e.preventDefault();
	        e.stopPropagation();
	        this.wheelController.onWheel(e);
	    }
	    onContextMenu(position, target) {
	        const commandOrNull = this.resolveClick(target, position);
	        this.contextMenuController.tryOpen(position, commandOrNull);
	    }
	    onIsDraggingChanged(isDragging) {
	        this.getRootComponent().setIsDragging(isDragging);
	    }
	    onViewportChanged(viewport) {
	        this.view.setPositionAndScale(viewport.position, viewport.scale);
	    }
	    onStateChanged(definitionChanged, selectedStepIdChanged, folderPathChanged) {
	        if (folderPathChanged) {
	            this.updateRootComponent();
	            this.viewportApi.resetViewport();
	        }
	        else if (definitionChanged) {
	            if (definitionChanged.changeType === exports.DefinitionChangeType.stepPropertyChanged) {
	                this.updateBadges();
	            }
	            else {
	                this.updateRootComponent();
	            }
	        }
	        else if (selectedStepIdChanged !== undefined) {
	            this.trySelectStepComponent(selectedStepIdChanged);
	        }
	    }
	    trySelectStepComponent(stepId) {
	        if (this.selectedStepComponent) {
	            this.selectedStepComponent.setIsSelected(false);
	            this.selectedStepComponent = null;
	        }
	        if (stepId) {
	            this.selectedStepComponent = this.getRootComponent().findById(stepId);
	            if (this.selectedStepComponent) {
	                this.selectedStepComponent.setIsSelected(true);
	            }
	        }
	    }
	    resolveClick(element, position) {
	        const click = {
	            element,
	            position,
	            scale: this.state.viewport.scale
	        };
	        return this.getRootComponent().resolveClick(click);
	    }
	    getRootComponent() {
	        if (this.view.rootComponent) {
	            return this.view.rootComponent;
	        }
	        throw new Error('Root component not found');
	    }
	}

	class DesignerView {
	    static create(parent, designerContext, api) {
	        const root = Dom.element('div', {
	            class: `sqd-designer sqd-theme-${designerContext.theme}`
	        });
	        parent.appendChild(root);
	        const workspace = Workspace.create(root, designerContext, api);
	        const uiComponents = designerContext.services.uiComponents.map(factory => factory.create(root, api));
	        const daemons = designerContext.services.daemons.map(factory => factory.create(api));
	        const view = new DesignerView(root, designerContext.layoutController, workspace, uiComponents, daemons);
	        view.reloadLayout();
	        window.addEventListener('resize', view.onResizeHandler, false);
	        return view;
	    }
	    constructor(root, layoutController, workspace, uiComponents, daemons) {
	        this.root = root;
	        this.layoutController = layoutController;
	        this.workspace = workspace;
	        this.uiComponents = uiComponents;
	        this.daemons = daemons;
	        this.onResizeHandler = () => this.onResize();
	    }
	    destroy() {
	        var _a;
	        window.removeEventListener('resize', this.onResizeHandler, false);
	        this.workspace.destroy();
	        this.uiComponents.forEach(component => component.destroy());
	        this.daemons.forEach(daemon => daemon.destroy());
	        (_a = this.root.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.root);
	    }
	    onResize() {
	        this.reloadLayout();
	    }
	    reloadLayout() {
	        const isMobile = this.layoutController.isMobile();
	        Dom.toggleClass(this.root, !isMobile, 'sqd-layout-desktop');
	        Dom.toggleClass(this.root, isMobile, 'sqd-layout-mobile');
	    }
	}

	const SAFE_OFFSET = 10;
	class DefaultDraggedComponent {
	    static create(parent, step, componentContext) {
	        const canvas = Dom.svg('svg');
	        canvas.style.marginLeft = -SAFE_OFFSET + 'px';
	        canvas.style.marginTop = -SAFE_OFFSET + 'px';
	        parent.appendChild(canvas);
	        const fakeStepContext = {
	            parentSequence: [],
	            step,
	            depth: 0,
	            position: 0,
	            isInputConnected: true,
	            isOutputConnected: true
	        };
	        const stepComponent = componentContext.stepComponentFactory.create(canvas, fakeStepContext, componentContext);
	        Dom.attrs(canvas, {
	            width: stepComponent.view.width + SAFE_OFFSET * 2,
	            height: stepComponent.view.height + SAFE_OFFSET * 2
	        });
	        Dom.translate(stepComponent.view.g, SAFE_OFFSET, SAFE_OFFSET);
	        return new DefaultDraggedComponent(stepComponent.view.width, stepComponent.view.height);
	    }
	    constructor(width, height) {
	        this.width = width;
	        this.height = height;
	    }
	    destroy() {
	        // Nothing to destroy...
	    }
	}

	class DefaultDraggedComponentExtension {
	    constructor() {
	        this.create = DefaultDraggedComponent.create;
	    }
	}

	class ControlBarView {
	    static create(parent, isUndoRedoSupported) {
	        const root = Dom.element('div', {
	            class: 'sqd-control-bar'
	        });
	        const resetButton = createButton(Icons.center, 'Reset view');
	        root.appendChild(resetButton);
	        const zoomInButton = createButton(Icons.zoomIn, 'Zoom in');
	        root.appendChild(zoomInButton);
	        const zoomOutButton = createButton(Icons.zoomOut, 'Zoom out');
	        root.appendChild(zoomOutButton);
	        let undoButton = null;
	        let redoButton = null;
	        if (isUndoRedoSupported) {
	            undoButton = createButton(Icons.undo, 'Undo');
	            root.appendChild(undoButton);
	            redoButton = createButton(Icons.redo, 'Redo');
	            root.appendChild(redoButton);
	        }
	        const disableDragButton = createButton(Icons.move, 'Turn on/off drag and drop');
	        disableDragButton.classList.add('sqd-disabled');
	        root.appendChild(disableDragButton);
	        const deleteButton = createButton(Icons.delete, 'Delete selected step');
	        deleteButton.classList.add('sqd-delete');
	        deleteButton.classList.add('sqd-hidden');
	        root.appendChild(deleteButton);
	        parent.appendChild(root);
	        return new ControlBarView(resetButton, zoomInButton, zoomOutButton, undoButton, redoButton, disableDragButton, deleteButton);
	    }
	    constructor(resetButton, zoomInButton, zoomOutButton, undoButton, redoButton, disableDragButton, deleteButton) {
	        this.resetButton = resetButton;
	        this.zoomInButton = zoomInButton;
	        this.zoomOutButton = zoomOutButton;
	        this.undoButton = undoButton;
	        this.redoButton = redoButton;
	        this.disableDragButton = disableDragButton;
	        this.deleteButton = deleteButton;
	    }
	    bindResetButtonClick(handler) {
	        bindClick(this.resetButton, handler);
	    }
	    bindZoomInButtonClick(handler) {
	        bindClick(this.zoomInButton, handler);
	    }
	    bindZoomOutButtonClick(handler) {
	        bindClick(this.zoomOutButton, handler);
	    }
	    bindUndoButtonClick(handler) {
	        if (!this.undoButton) {
	            throw new Error('Undo button is disabled');
	        }
	        bindClick(this.undoButton, handler);
	    }
	    bindRedoButtonClick(handler) {
	        if (!this.redoButton) {
	            throw new Error('Redo button is disabled');
	        }
	        bindClick(this.redoButton, handler);
	    }
	    bindDisableDragButtonClick(handler) {
	        bindClick(this.disableDragButton, handler);
	    }
	    bindDeleteButtonClick(handler) {
	        bindClick(this.deleteButton, handler);
	    }
	    setIsDeleteButtonHidden(isHidden) {
	        Dom.toggleClass(this.deleteButton, isHidden, 'sqd-hidden');
	    }
	    setDisableDragButtonDisabled(isDisabled) {
	        Dom.toggleClass(this.disableDragButton, isDisabled, 'sqd-disabled');
	    }
	    setUndoButtonDisabled(isDisabled) {
	        if (!this.undoButton) {
	            throw new Error('Undo button is disabled');
	        }
	        Dom.toggleClass(this.undoButton, isDisabled, 'sqd-disabled');
	    }
	    setRedoButtonDisabled(isDisabled) {
	        if (!this.redoButton) {
	            throw new Error('Redo button is disabled');
	        }
	        Dom.toggleClass(this.redoButton, isDisabled, 'sqd-disabled');
	    }
	}
	function bindClick(element, handler) {
	    element.addEventListener('click', e => {
	        e.preventDefault();
	        handler();
	    }, false);
	}
	function createButton(d, title) {
	    const button = Dom.element('div', {
	        class: 'sqd-control-bar-button',
	        title
	    });
	    const icon = Icons.createSvg('sqd-control-bar-button-icon', d);
	    button.appendChild(icon);
	    return button;
	}

	class ControlBar {
	    static create(parent, api) {
	        const isUndoRedoSupported = api.controlBar.isUndoRedoSupported();
	        const view = ControlBarView.create(parent, isUndoRedoSupported);
	        const bar = new ControlBar(view, api.controlBar, isUndoRedoSupported);
	        view.bindResetButtonClick(() => bar.onResetButtonClicked());
	        view.bindZoomInButtonClick(() => bar.onZoomInButtonClicked());
	        view.bindZoomOutButtonClick(() => bar.onZoomOutButtonClicked());
	        view.bindDisableDragButtonClick(() => bar.onMoveButtonClicked());
	        view.bindDeleteButtonClick(() => bar.onDeleteButtonClicked());
	        api.controlBar.subscribe(() => bar.refreshButtons());
	        if (isUndoRedoSupported) {
	            view.bindUndoButtonClick(() => bar.onUndoButtonClicked());
	            view.bindRedoButtonClick(() => bar.onRedoButtonClicked());
	        }
	        bar.refreshButtons();
	        return bar;
	    }
	    constructor(view, controlBarApi, isUndoRedoSupported) {
	        this.view = view;
	        this.controlBarApi = controlBarApi;
	        this.isUndoRedoSupported = isUndoRedoSupported;
	    }
	    destroy() {
	        //
	    }
	    onResetButtonClicked() {
	        this.controlBarApi.resetViewport();
	    }
	    onZoomInButtonClicked() {
	        this.controlBarApi.zoomIn();
	    }
	    onZoomOutButtonClicked() {
	        this.controlBarApi.zoomOut();
	    }
	    onMoveButtonClicked() {
	        this.controlBarApi.toggleIsDragDisabled();
	    }
	    onUndoButtonClicked() {
	        this.controlBarApi.tryUndo();
	    }
	    onRedoButtonClicked() {
	        this.controlBarApi.tryRedo();
	    }
	    onDeleteButtonClicked() {
	        this.controlBarApi.tryDelete();
	    }
	    refreshButtons() {
	        this.refreshDeleteButtonVisibility();
	        this.refreshIsDragDisabled();
	        if (this.isUndoRedoSupported) {
	            this.refreshUndoRedoAvailability();
	        }
	    }
	    //
	    refreshIsDragDisabled() {
	        const isDragDisabled = this.controlBarApi.isDragDisabled();
	        this.view.setDisableDragButtonDisabled(!isDragDisabled);
	    }
	    refreshUndoRedoAvailability() {
	        const canUndo = this.controlBarApi.canUndo();
	        const canRedo = this.controlBarApi.canRedo();
	        this.view.setUndoButtonDisabled(!canUndo);
	        this.view.setRedoButtonDisabled(!canRedo);
	    }
	    refreshDeleteButtonVisibility() {
	        const canDelete = this.controlBarApi.canDelete();
	        this.view.setIsDeleteButtonHidden(!canDelete);
	    }
	}

	class ControlBarExtension {
	    constructor() {
	        this.create = ControlBar.create;
	    }
	}

	const supportedKeys = ['Backspace', 'Delete'];
	const ignoreTagNames = ['INPUT', 'TEXTAREA'];
	class KeyboardDaemon {
	    static create(api) {
	        const controller = new KeyboardDaemon(api.controlBar);
	        document.addEventListener('keyup', controller.onKeyUp, false);
	        return controller;
	    }
	    constructor(controlBarApi) {
	        this.controlBarApi = controlBarApi;
	        this.onKeyUp = (e) => {
	            if (!supportedKeys.includes(e.key)) {
	                return;
	            }
	            if (document.activeElement && ignoreTagNames.includes(document.activeElement.tagName)) {
	                return;
	            }
	            const isDeletable = this.controlBarApi.canDelete();
	            if (isDeletable) {
	                e.preventDefault();
	                e.stopPropagation();
	                this.controlBarApi.tryDelete();
	            }
	        };
	    }
	    destroy() {
	        document.removeEventListener('keyup', this.onKeyUp, false);
	    }
	}

	class KeyboardDaemonExtension {
	    constructor() {
	        this.create = KeyboardDaemon.create;
	    }
	}

	class SmartEditorView {
	    static create(parent, api, configuration) {
	        const root = Dom.element('div', {
	            class: 'sqd-smart-editor'
	        });
	        const toggle = Dom.element('div', {
	            class: 'sqd-smart-editor-toggle',
	            title: 'Toggle editor'
	        });
	        parent.appendChild(toggle);
	        parent.appendChild(root);
	        const editor = Editor.create(root, api, 'sqd-editor sqd-step-editor', configuration.stepEditorProvider, 'sqd-editor sqd-global-editor', configuration.globalEditorProvider);
	        return new SmartEditorView(root, toggle, editor);
	    }
	    constructor(root, toggle, editor) {
	        this.root = root;
	        this.toggle = toggle;
	        this.editor = editor;
	    }
	    bindToggleClick(handler) {
	        this.toggle.addEventListener('click', e => {
	            e.preventDefault();
	            handler();
	        }, false);
	    }
	    setIsCollapsed(isCollapsed) {
	        Dom.toggleClass(this.root, isCollapsed, 'sqd-hidden');
	        Dom.toggleClass(this.toggle, isCollapsed, 'sqd-collapsed');
	        if (this.toggleIcon) {
	            this.toggle.removeChild(this.toggleIcon);
	        }
	        this.toggleIcon = Icons.createSvg('sqd-smart-editor-toggle-icon', isCollapsed ? Icons.options : Icons.close);
	        this.toggle.appendChild(this.toggleIcon);
	    }
	    destroy() {
	        this.editor.destroy();
	    }
	}

	class SmartEditor {
	    static create(parent, api, configuration) {
	        const view = SmartEditorView.create(parent, api.editor, configuration);
	        const editor = new SmartEditor(view, api.editor, api.workspace);
	        editor.updateVisibility();
	        view.bindToggleClick(() => editor.onToggleClicked());
	        api.editor.subscribeIsCollapsed(() => editor.onIsCollapsedChanged());
	        return editor;
	    }
	    constructor(view, editorApi, workspaceApi) {
	        this.view = view;
	        this.editorApi = editorApi;
	        this.workspaceApi = workspaceApi;
	    }
	    onToggleClicked() {
	        this.editorApi.toggleIsCollapsed();
	    }
	    setIsCollapsed(isCollapsed) {
	        this.view.setIsCollapsed(isCollapsed);
	    }
	    onIsCollapsedChanged() {
	        this.updateVisibility();
	        this.workspaceApi.updateCanvasSize();
	    }
	    updateVisibility() {
	        this.setIsCollapsed(this.editorApi.isCollapsed());
	    }
	    destroy() {
	        this.view.destroy();
	    }
	}

	class SmartEditorExtension {
	    constructor(configuration) {
	        this.configuration = configuration;
	    }
	    create(root, api) {
	        return SmartEditor.create(root, api, this.configuration);
	    }
	}

	const listenerOptions = {
	    passive: false
	};
	class ScrollBoxView {
	    static create(parent, viewport) {
	        const root = Dom.element('div', {
	            class: 'sqd-scrollbox'
	        });
	        parent.appendChild(root);
	        const view = new ScrollBoxView(root, viewport);
	        window.addEventListener('resize', view.onResize, false);
	        root.addEventListener('wheel', e => view.onWheel(e), false);
	        root.addEventListener('touchstart', e => view.onTouchStart(e), listenerOptions);
	        root.addEventListener('mousedown', e => view.onMouseDown(e), false);
	        return view;
	    }
	    constructor(root, viewport) {
	        this.root = root;
	        this.viewport = viewport;
	        this.onResize = () => {
	            this.refresh();
	        };
	        this.onTouchStart = (e) => {
	            e.preventDefault();
	            this.startScroll(readTouchPosition(e));
	        };
	        this.onMouseDown = (e) => {
	            this.startScroll(readMousePosition(e));
	        };
	        this.onTouchMove = (e) => {
	            e.preventDefault();
	            this.moveScroll(readTouchPosition(e));
	        };
	        this.onMouseMove = (e) => {
	            e.preventDefault();
	            this.moveScroll(readMousePosition(e));
	        };
	        this.onTouchEnd = (e) => {
	            e.preventDefault();
	            this.stopScroll();
	        };
	        this.onMouseUp = (e) => {
	            e.preventDefault();
	            this.stopScroll();
	        };
	    }
	    setContent(element) {
	        if (this.content) {
	            this.root.removeChild(this.content.element);
	        }
	        element.classList.add('sqd-scrollbox-body');
	        this.root.appendChild(element);
	        this.reload(element);
	    }
	    refresh() {
	        if (this.content) {
	            this.reload(this.content.element);
	        }
	    }
	    destroy() {
	        window.removeEventListener('resize', this.onResize, false);
	    }
	    reload(element) {
	        const maxHeightPercent = 0.7;
	        const minDistance = 206;
	        let height = Math.min(this.viewport.clientHeight * maxHeightPercent, element.clientHeight);
	        height = Math.min(height, this.viewport.clientHeight - minDistance);
	        this.root.style.height = height + 'px';
	        element.style.top = '0px';
	        this.content = {
	            element,
	            height
	        };
	    }
	    onWheel(e) {
	        e.stopPropagation();
	        if (this.content) {
	            const delta = e.deltaY > 0 ? -25 : 25;
	            const scrollTop = this.getScrollTop();
	            this.setScrollTop(scrollTop + delta);
	        }
	    }
	    startScroll(startPosition) {
	        if (!this.scroll) {
	            window.addEventListener('touchmove', this.onTouchMove, listenerOptions);
	            window.addEventListener('mousemove', this.onMouseMove, false);
	            window.addEventListener('touchend', this.onTouchEnd, listenerOptions);
	            window.addEventListener('mouseup', this.onMouseUp, false);
	        }
	        this.scroll = {
	            startPositionY: startPosition.y,
	            startScrollTop: this.getScrollTop()
	        };
	    }
	    moveScroll(position) {
	        if (this.scroll) {
	            const delta = position.y - this.scroll.startPositionY;
	            this.setScrollTop(this.scroll.startScrollTop + delta);
	        }
	    }
	    stopScroll() {
	        if (this.scroll) {
	            window.removeEventListener('touchmove', this.onTouchMove, listenerOptions);
	            window.removeEventListener('mousemove', this.onMouseMove, false);
	            window.removeEventListener('touchend', this.onTouchEnd, listenerOptions);
	            window.removeEventListener('mouseup', this.onMouseUp, false);
	            this.scroll = undefined;
	        }
	    }
	    getScrollTop() {
	        if (this.content && this.content.element.style.top) {
	            return parseInt(this.content.element.style.top);
	        }
	        return 0;
	    }
	    setScrollTop(scrollTop) {
	        if (this.content) {
	            const max = this.content.element.clientHeight - this.content.height;
	            const limited = Math.max(Math.min(scrollTop, 0), -max);
	            this.content.element.style.top = limited + 'px';
	        }
	    }
	}

	const regexp = /^[a-zA-Z][a-zA-Z0-9_-]+$/;
	class StepTypeValidator {
	    static validate(type) {
	        if (!regexp.test(type)) {
	            throw new Error(`Step type "${type}" contains not allowed characters`);
	        }
	    }
	}

	class ToolboxItemView {
	    static create(parent, step, api) {
	        const label = api.getLabel(step);
	        const root = Dom.element('div', {
	            class: `sqd-toolbox-item sqd-type-${step.type}`,
	            title: label
	        });
	        const iconUrl = api.tryGetIconUrl(step);
	        const icon = Dom.element('div', {
	            class: 'sqd-toolbox-item-icon'
	        });
	        if (iconUrl) {
	            const iconImage = Dom.element('img', {
	                class: 'sqd-toolbox-item-icon-image',
	                src: iconUrl
	            });
	            icon.appendChild(iconImage);
	        }
	        else {
	            icon.classList.add('sqd-no-icon');
	        }
	        const text = Dom.element('div', {
	            class: 'sqd-toolbox-item-text'
	        });
	        text.textContent = label;
	        root.appendChild(icon);
	        root.appendChild(text);
	        parent.appendChild(root);
	        return new ToolboxItemView(root);
	    }
	    constructor(root) {
	        this.root = root;
	    }
	    bindMousedown(handler) {
	        this.root.addEventListener('mousedown', handler, false);
	    }
	    bindTouchstart(handler) {
	        this.root.addEventListener('touchstart', handler, false);
	    }
	    bindContextMenu(handler) {
	        this.root.addEventListener('contextmenu', handler, false);
	    }
	}

	class ToolboxItem {
	    static create(parent, step, api) {
	        StepTypeValidator.validate(step.type);
	        const view = ToolboxItemView.create(parent, step, api);
	        const item = new ToolboxItem(step, api);
	        view.bindMousedown(e => item.onMousedown(e));
	        view.bindTouchstart(e => item.onTouchstart(e));
	        view.bindContextMenu(e => item.onContextMenu(e));
	        return item;
	    }
	    constructor(step, api) {
	        this.step = step;
	        this.api = api;
	    }
	    onTouchstart(e) {
	        e.preventDefault();
	        if (e.touches.length === 1) {
	            e.stopPropagation();
	            this.tryDrag(readTouchPosition(e));
	        }
	    }
	    onMousedown(e) {
	        e.stopPropagation();
	        const isPrimaryButton = e.button === 0;
	        if (isPrimaryButton) {
	            this.tryDrag(readMousePosition(e));
	        }
	    }
	    onContextMenu(e) {
	        e.preventDefault();
	    }
	    tryDrag(position) {
	        this.api.tryDrag(position, this.step);
	    }
	}

	class ToolboxView {
	    static create(parent, api) {
	        const root = Dom.element('div', {
	            class: 'sqd-toolbox'
	        });
	        const header = Dom.element('div', {
	            class: 'sqd-toolbox-header'
	        });
	        const headerTitle = Dom.element('div', {
	            class: 'sqd-toolbox-header-title'
	        });
	        headerTitle.innerText = 'Toolbox';
	        const body = Dom.element('div', {
	            class: 'sqd-toolbox-body'
	        });
	        const filterInput = Dom.element('input', {
	            class: 'sqd-toolbox-filter',
	            type: 'text',
	            placeholder: 'Search...'
	        });
	        root.appendChild(header);
	        root.appendChild(body);
	        header.appendChild(headerTitle);
	        body.appendChild(filterInput);
	        parent.appendChild(root);
	        const scrollBoxView = ScrollBoxView.create(body, parent);
	        return new ToolboxView(header, body, filterInput, scrollBoxView, api);
	    }
	    constructor(header, body, filterInput, scrollBoxView, api) {
	        this.header = header;
	        this.body = body;
	        this.filterInput = filterInput;
	        this.scrollBoxView = scrollBoxView;
	        this.api = api;
	    }
	    bindToggleClick(handler) {
	        function forward(e) {
	            e.preventDefault();
	            handler();
	        }
	        this.header.addEventListener('click', forward, false);
	    }
	    bindFilterInputChange(handler) {
	        function forward(e) {
	            handler(e.target.value);
	        }
	        this.filterInput.addEventListener('keyup', forward, false);
	        this.filterInput.addEventListener('blur', forward, false);
	    }
	    setIsCollapsed(isCollapsed) {
	        Dom.toggleClass(this.body, isCollapsed, 'sqd-hidden');
	        if (this.headerToggleIcon) {
	            this.header.removeChild(this.headerToggleIcon);
	        }
	        this.headerToggleIcon = Icons.createSvg('sqd-toolbox-toggle-icon', isCollapsed ? Icons.expand : Icons.close);
	        this.header.appendChild(this.headerToggleIcon);
	        if (!isCollapsed) {
	            this.scrollBoxView.refresh();
	        }
	    }
	    setGroups(groups) {
	        const list = Dom.element('div');
	        groups.forEach(group => {
	            const groupTitle = Dom.element('div', {
	                class: 'sqd-toolbox-group-title'
	            });
	            groupTitle.innerText = group.name;
	            list.appendChild(groupTitle);
	            group.steps.forEach(s => ToolboxItem.create(list, s, this.api));
	        });
	        this.scrollBoxView.setContent(list);
	    }
	    destroy() {
	        this.scrollBoxView.destroy();
	    }
	}

	class Toolbox {
	    static create(root, api) {
	        const view = ToolboxView.create(root, api);
	        const toolbox = new Toolbox(view, api);
	        toolbox.render();
	        toolbox.onIsCollapsedChanged();
	        view.bindToggleClick(() => toolbox.onToggleClicked());
	        view.bindFilterInputChange(v => toolbox.onFilterInputChanged(v));
	        api.subscribeIsCollapsed(() => toolbox.onIsCollapsedChanged());
	        return toolbox;
	    }
	    constructor(view, api) {
	        this.view = view;
	        this.api = api;
	    }
	    destroy() {
	        this.view.destroy();
	    }
	    render() {
	        const groups = this.api.filterGroups(this.filter);
	        this.view.setGroups(groups);
	    }
	    onIsCollapsedChanged() {
	        this.view.setIsCollapsed(this.api.isCollapsed());
	    }
	    onToggleClicked() {
	        this.api.toggleIsCollapsed();
	    }
	    onFilterInputChanged(value) {
	        this.filter = value.toLowerCase();
	        this.render();
	    }
	}

	class ToolboxExtension {
	    create(root, api) {
	        return Toolbox.create(root, api.toolbox);
	    }
	}

	const defaultConfiguration$4 = {
	    view: {
	        paddingTop: 20,
	        paddingX: 20,
	        inputSize: 18,
	        inputIconSize: 14,
	        label: {
	            height: 22,
	            paddingX: 10,
	            minWidth: 50,
	            radius: 10
	        }
	    }
	};
	class ContainerStepExtension {
	    static create(configuration) {
	        return new ContainerStepExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration$4);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	        this.componentType = 'container';
	        this.createComponentView = createContainerStepComponentViewFactory(this.configuration.view);
	    }
	}

	class DefaultPlaceholderControllerExtension {
	    create() {
	        return {
	            canCreate: () => true
	        };
	    }
	}

	const defaultConfiguration$3 = {
	    gapWidth: 100,
	    gapHeight: 24,
	    radius: 6,
	    iconSize: 16
	};
	class RectPlaceholderExtension {
	    static create(configuration) {
	        return new RectPlaceholderExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration$3);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	        this.gapSize = new Vector(this.configuration.gapWidth, this.configuration.gapHeight);
	    }
	    createForGap(parent, parentSequence, index) {
	        return RectPlaceholder.create(parent, this.gapSize, exports.PlaceholderDirection.none, parentSequence, index, this.configuration);
	    }
	    createForArea(parent, size, direction, parentSequence, index) {
	        return RectPlaceholder.create(parent, size, direction, parentSequence, index, this.configuration);
	    }
	}

	const SIZE = 30;
	const DEFAULT_ICON_SIZE = 22;
	const FOLDER_ICON_SIZE = 18;
	class StartStopRootComponentView {
	    static create(parent, sequence, parentPlaceIndicator, context) {
	        const g = Dom.svg('g', {
	            class: 'sqd-root-start-stop'
	        });
	        parent.appendChild(g);
	        const sequenceComponent = DefaultSequenceComponent.create(g, {
	            sequence,
	            depth: 0,
	            isInputConnected: true,
	            isOutputConnected: true
	        }, context);
	        const view = sequenceComponent.view;
	        const x = view.joinX - SIZE / 2;
	        const endY = SIZE + view.height;
	        const iconSize = parentPlaceIndicator ? FOLDER_ICON_SIZE : DEFAULT_ICON_SIZE;
	        const startCircle = createCircle(parentPlaceIndicator ? Icons.folder : Icons.play, iconSize);
	        Dom.translate(startCircle, x, 0);
	        g.appendChild(startCircle);
	        Dom.translate(view.g, 0, SIZE);
	        const endCircle = createCircle(parentPlaceIndicator ? Icons.folder : Icons.stop, iconSize);
	        Dom.translate(endCircle, x, endY);
	        g.appendChild(endCircle);
	        let startPlaceholder = null;
	        let endPlaceholder = null;
	        if (parentPlaceIndicator) {
	            const size = new Vector(SIZE, SIZE);
	            startPlaceholder = context.services.placeholder.createForArea(g, size, exports.PlaceholderDirection.out, parentPlaceIndicator.sequence, parentPlaceIndicator.index);
	            endPlaceholder = context.services.placeholder.createForArea(g, size, exports.PlaceholderDirection.out, parentPlaceIndicator.sequence, parentPlaceIndicator.index);
	            Dom.translate(startPlaceholder.view.g, x, 0);
	            Dom.translate(endPlaceholder.view.g, x, endY);
	        }
	        const badges = Badges.createForRoot(g, new Vector(x + SIZE, 0), context);
	        return new StartStopRootComponentView(g, view.width, view.height + SIZE * 2, view.joinX, sequenceComponent, startPlaceholder, endPlaceholder, badges);
	    }
	    constructor(g, width, height, joinX, component, startPlaceholder, endPlaceholder, badges) {
	        this.g = g;
	        this.width = width;
	        this.height = height;
	        this.joinX = joinX;
	        this.component = component;
	        this.startPlaceholder = startPlaceholder;
	        this.endPlaceholder = endPlaceholder;
	        this.badges = badges;
	    }
	    destroy() {
	        var _a;
	        (_a = this.g.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.g);
	    }
	}
	function createCircle(d, iconSize) {
	    const r = SIZE / 2;
	    const circle = Dom.svg('circle', {
	        class: 'sqd-root-start-stop-circle',
	        cx: r,
	        cy: r,
	        r: r
	    });
	    const g = Dom.svg('g');
	    g.appendChild(circle);
	    const offset = (SIZE - iconSize) / 2;
	    const icon = Icons.appendPath(g, 'sqd-root-start-stop-icon', d, iconSize);
	    Dom.translate(icon, offset, offset);
	    return g;
	}

	class StartStopRootComponent {
	    static create(parentElement, sequence, parentPlaceIndicator, context) {
	        const view = StartStopRootComponentView.create(parentElement, sequence, parentPlaceIndicator, context);
	        return new StartStopRootComponent(view);
	    }
	    constructor(view) {
	        this.view = view;
	    }
	    resolveClick(click) {
	        return this.view.component.resolveClick(click);
	    }
	    findById(stepId) {
	        return this.view.component.findById(stepId);
	    }
	    getPlaceholders(result) {
	        this.view.component.getPlaceholders(result);
	        if (this.view.startPlaceholder && this.view.endPlaceholder) {
	            result.push(this.view.startPlaceholder);
	            result.push(this.view.endPlaceholder);
	        }
	    }
	    setIsDragging(isDragging) {
	        this.view.component.setIsDragging(isDragging);
	        if (this.view.startPlaceholder && this.view.endPlaceholder) {
	            this.view.startPlaceholder.setIsVisible(isDragging);
	            this.view.endPlaceholder.setIsVisible(isDragging);
	        }
	    }
	    updateBadges(result) {
	        this.view.badges.update(result);
	        this.view.component.updateBadges(result);
	    }
	}

	class StartStopRootComponentExtension {
	    constructor() {
	        this.create = StartStopRootComponent.create;
	    }
	}

	const defaultConfiguration$2 = {
	    view: {
	        minContainerWidth: 40,
	        paddingX: 20,
	        paddingTop: 20,
	        connectionHeight: 16,
	        inputSize: 18,
	        inputIconSize: 14,
	        branchNameLabel: {
	            height: 22,
	            paddingX: 10,
	            minWidth: 50,
	            radius: 10
	        },
	        nameLabel: {
	            height: 22,
	            paddingX: 10,
	            minWidth: 50,
	            radius: 10
	        }
	    }
	};
	class SwitchStepExtension {
	    static create(configuration) {
	        return new SwitchStepExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration$2);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	        this.componentType = 'switch';
	        this.createComponentView = createSwitchStepComponentViewFactory(this.configuration.view);
	    }
	}

	const defaultConfiguration$1 = {
	    view: {
	        paddingLeft: 12,
	        paddingRight: 12,
	        paddingY: 10,
	        textMarginLeft: 12,
	        minTextWidth: 70,
	        iconSize: 22,
	        radius: 5,
	        inputSize: 14,
	        outputSize: 10
	    }
	};
	class TaskStepExtension {
	    static create(configuration) {
	        return new TaskStepExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration$1);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	        this.componentType = 'task';
	        this.createComponentView = createTaskStepComponentViewFactory(false, this.configuration.view);
	    }
	}

	class DefaultSequenceComponentExtension {
	    constructor() {
	        this.create = DefaultSequenceComponent.create;
	    }
	}

	class DefaultStepComponentViewWrapperExtension {
	    constructor() {
	        this.wrap = (view) => view;
	    }
	}

	class LineGrid {
	    static create(size) {
	        const path = Dom.svg('path', {
	            class: 'sqd-grid-path',
	            fill: 'none'
	        });
	        return new LineGrid(size, path);
	    }
	    constructor(size, element) {
	        this.size = size;
	        this.element = element;
	    }
	    setScale(_, scaledSize) {
	        Dom.attrs(this.element, {
	            d: `M ${scaledSize.x} 0 L 0 0 0 ${scaledSize.y}`
	        });
	    }
	}

	const defaultConfiguration = {
	    gridSizeX: 48,
	    gridSizeY: 48
	};
	class LineGridExtension {
	    static create(configuration) {
	        return new LineGridExtension(configuration !== null && configuration !== void 0 ? configuration : defaultConfiguration);
	    }
	    constructor(configuration) {
	        this.configuration = configuration;
	    }
	    create() {
	        const size = new Vector(this.configuration.gridSizeX, this.configuration.gridSizeY);
	        return LineGrid.create(size);
	    }
	}

	class ServicesResolver {
	    static resolve(extensions, configuration) {
	        const services = {};
	        merge(services, extensions || []);
	        setDefault(services, configuration);
	        return services;
	    }
	}
	function merge(services, extensions) {
	    for (const ext of extensions) {
	        if (ext.steps) {
	            services.steps = (services.steps || []).concat(ext.steps);
	        }
	        if (ext.stepComponentViewWrapper) {
	            services.stepComponentViewWrapper = ext.stepComponentViewWrapper;
	        }
	        if (ext.badges) {
	            services.badges = (services.badges || []).concat(ext.badges);
	        }
	        if (ext.uiComponents) {
	            services.uiComponents = (services.uiComponents || []).concat(ext.uiComponents);
	        }
	        if (ext.draggedComponent) {
	            services.draggedComponent = ext.draggedComponent;
	        }
	        if (ext.wheelController) {
	            services.wheelController = ext.wheelController;
	        }
	        if (ext.placeholderController) {
	            services.placeholderController = ext.placeholderController;
	        }
	        if (ext.placeholder) {
	            services.placeholder = ext.placeholder;
	        }
	        if (ext.viewportController) {
	            services.viewportController = ext.viewportController;
	        }
	        if (ext.grid) {
	            services.grid = ext.grid;
	        }
	        if (ext.rootComponent) {
	            services.rootComponent = ext.rootComponent;
	        }
	        if (ext.sequenceComponent) {
	            services.sequenceComponent = ext.sequenceComponent;
	        }
	        if (ext.daemons) {
	            services.daemons = (services.daemons || []).concat(ext.daemons);
	        }
	    }
	}
	function setDefault(services, configuration) {
	    if (!services.steps) {
	        services.steps = [];
	    }
	    services.steps.push(ContainerStepExtension.create());
	    services.steps.push(SwitchStepExtension.create());
	    services.steps.push(TaskStepExtension.create());
	    if (!services.stepComponentViewWrapper) {
	        services.stepComponentViewWrapper = new DefaultStepComponentViewWrapperExtension();
	    }
	    if (!services.badges) {
	        services.badges = [];
	    }
	    if (findValidationBadgeIndex(services.badges) < 0) {
	        services.badges.push(ValidationErrorBadgeExtension.create());
	    }
	    if (!services.draggedComponent) {
	        services.draggedComponent = new DefaultDraggedComponentExtension();
	    }
	    if (!services.uiComponents) {
	        services.uiComponents = [];
	    }
	    if (configuration.controlBar) {
	        services.uiComponents.push(new ControlBarExtension());
	    }
	    if (configuration.editors) {
	        services.uiComponents.push(new SmartEditorExtension(configuration.editors));
	    }
	    if (configuration.toolbox) {
	        services.uiComponents.push(new ToolboxExtension());
	    }
	    if (!services.wheelController) {
	        services.wheelController = new ClassicWheelControllerExtension();
	    }
	    if (!services.placeholderController) {
	        services.placeholderController = new DefaultPlaceholderControllerExtension();
	    }
	    if (!services.placeholder) {
	        services.placeholder = RectPlaceholderExtension.create();
	    }
	    if (!services.viewportController) {
	        services.viewportController = new DefaultViewportControllerExtension();
	    }
	    if (!services.grid) {
	        services.grid = LineGridExtension.create();
	    }
	    if (!services.rootComponent) {
	        services.rootComponent = new StartStopRootComponentExtension();
	    }
	    if (!services.sequenceComponent) {
	        services.sequenceComponent = new DefaultSequenceComponentExtension();
	    }
	    if (!services.daemons) {
	        services.daemons = [];
	    }
	    services.daemons.push(new KeyboardDaemonExtension());
	}

	function throwDepreciatedError(propertyName, groupName) {
	    throw new Error(`The "${propertyName}" property in the "${groupName}" configuration is depreciated`);
	}
	function validateConfiguration(configuration) {
	    if (configuration.controlBar === undefined) {
	        throw new Error('The "controlBar" property is not defined in the configuration');
	    }
	    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	    if (configuration.toolbox && configuration.toolbox.isHidden !== undefined) {
	        throwDepreciatedError('isHidden', 'toolbox');
	    }
	    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	    if (configuration.editors && configuration.editors.isHidden !== undefined) {
	        throwDepreciatedError('isHidden', 'editors');
	    }
	    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	    if (configuration.steps.validator) {
	        throwDepreciatedError('validator', 'steps');
	    }
	}

	class Designer {
	    /**
	     * Creates a designer.
	     * @param placeholder Placeholder where the designer will be attached.
	     * @param startDefinition Start definition of a flow.
	     * @param configuration Designer's configuration.
	     * @returns An instance of the designer.
	     */
	    static create(placeholder, startDefinition, configuration) {
	        if (!placeholder) {
	            throw new Error('Placeholder is not set');
	        }
	        if (!isElementAttached(placeholder)) {
	            throw new Error('Placeholder is not attached to the DOM');
	        }
	        if (!startDefinition) {
	            throw new Error('Start definition is not set');
	        }
	        if (!configuration) {
	            throw new Error('Configuration is not set');
	        }
	        const config = configuration;
	        validateConfiguration(config);
	        const services = ServicesResolver.resolve(configuration.extensions, config);
	        const designerContext = DesignerContext.create(placeholder, startDefinition, config, services);
	        const designerApi = DesignerApi.create(designerContext);
	        const view = DesignerView.create(placeholder, designerContext, designerApi);
	        const designer = new Designer(view, designerContext.state, designerContext.definitionWalker, designerApi);
	        view.workspace.onReady.subscribe(() => designer.onReady.forward());
	        designerContext.state.onDefinitionChanged.subscribe(() => {
	            setTimeout(() => designer.onDefinitionChanged.forward(designerContext.state.definition));
	        });
	        designerContext.state.onSelectedStepIdChanged.subscribe(() => designer.onSelectedStepIdChanged.forward(designerContext.state.selectedStepId));
	        designer.state.onIsToolboxCollapsedChanged.subscribe(isCollapsed => {
	            designer.onIsToolboxCollapsedChanged.forward(isCollapsed);
	        });
	        designer.state.onIsEditorCollapsedChanged.subscribe(isCollapsed => {
	            designer.onIsEditorCollapsedChanged.forward(isCollapsed);
	        });
	        return designer;
	    }
	    constructor(view, state, walker, api) {
	        this.view = view;
	        this.state = state;
	        this.walker = walker;
	        this.api = api;
	        /**
	         * @description Fires when the designer is initialized and ready to use.
	         */
	        this.onReady = new SimpleEvent();
	        /**
	         * @description Fires when the definition has changed.
	         */
	        this.onDefinitionChanged = new SimpleEvent();
	        /**
	         * @description Fires when the selected step has changed.
	         */
	        this.onSelectedStepIdChanged = new SimpleEvent();
	        /**
	         * @description Fires when the toolbox is collapsed or expanded.
	         */
	        this.onIsToolboxCollapsedChanged = new SimpleEvent();
	        /**
	         * @description Fires when the editor is collapsed or expanded.
	         */
	        this.onIsEditorCollapsedChanged = new SimpleEvent();
	    }
	    /**
	     * @returns the current definition of the workflow.
	     */
	    getDefinition() {
	        return this.state.definition;
	    }
	    /**
	     * @returns the validation result of the current definition.
	     */
	    isValid() {
	        return this.view.workspace.isValid;
	    }
	    /**
	     * @returns the readonly flag.
	     */
	    isReadonly() {
	        return this.state.isReadonly;
	    }
	    /**
	     * @description Changes the readonly flag.
	     */
	    setIsReadonly(isReadonly) {
	        this.state.setIsReadonly(isReadonly);
	    }
	    /**
	     * @returns current selected step id or `null` if nothing is selected.
	     */
	    getSelectedStepId() {
	        return this.state.selectedStepId;
	    }
	    /**
	     * @description Selects a step by the id.
	     */
	    selectStepById(stepId) {
	        this.state.setSelectedStepId(stepId);
	    }
	    /**
	     * @description Unselects the selected step.
	     */
	    clearSelectedStep() {
	        this.state.setSelectedStepId(null);
	    }
	    /**
	     * @description Moves the viewport to the step with the animation.
	     */
	    moveViewportToStep(stepId) {
	        this.api.viewport.moveViewportToStep(stepId);
	    }
	    /**
	     * @deprecated Use `moveViewportToStep` instead.
	     */
	    moveViewPortToStep(stepId) {
	        this.moveViewportToStep(stepId);
	    }
	    /**
	     * @description Rerender the root component and all its children.
	     */
	    updateRootComponent() {
	        this.api.workspace.updateRootComponent();
	    }
	    /**
	     * @description Updates all badges.
	     */
	    updateBadges() {
	        this.api.workspace.updateBadges();
	    }
	    /**
	     * @returns a flag that indicates whether the toolbox is collapsed.
	     */
	    isToolboxCollapsed() {
	        return this.state.isToolboxCollapsed;
	    }
	    /**
	     * @description Sets a flag that indicates whether the toolbox is collapsed.
	     */
	    setIsToolboxCollapsed(isCollapsed) {
	        this.state.setIsToolboxCollapsed(isCollapsed);
	    }
	    /**
	     * @returns a flag that indicates whether the editor is collapsed.
	     */
	    isEditorCollapsed() {
	        return this.state.isEditorCollapsed;
	    }
	    /**
	     * @description Sets a flag that indicates whether the editor is collapsed.
	     */
	    setIsEditorCollapsed(isCollapsed) {
	        this.state.setIsEditorCollapsed(isCollapsed);
	    }
	    /**
	     * @param needle A step, a sequence or a step id.
	     * @returns parent steps and branch names.
	     */
	    getStepParents(needle) {
	        return this.walker.getParents(this.state.definition, needle);
	    }
	    /**
	     * @description Destroys the designer and deletes all nodes from the placeholder.
	     */
	    destroy() {
	        this.view.destroy();
	    }
	}

	class LineGridDesignerExtension {
	    static create(configuration) {
	        const grid = LineGridExtension.create(configuration);
	        return new LineGridDesignerExtension(grid);
	    }
	    constructor(grid) {
	        this.grid = grid;
	    }
	}

	class StepsDesignerExtension {
	    static create(configuration) {
	        const steps = [];
	        if (configuration.container) {
	            steps.push(ContainerStepExtension.create(configuration.container));
	        }
	        if (configuration.switch) {
	            steps.push(SwitchStepExtension.create(configuration.switch));
	        }
	        if (configuration.task) {
	            steps.push(TaskStepExtension.create(configuration.task));
	        }
	        return new StepsDesignerExtension(steps);
	    }
	    constructor(steps) {
	        this.steps = steps;
	    }
	}
	/**
	 * @deprecated Use `StepsDesignerExtension` instead.
	 */
	class StepsExtension extends StepsDesignerExtension {
	}

	exports.Badges = Badges;
	exports.CenteredViewportCalculator = CenteredViewportCalculator;
	exports.ClassicWheelControllerExtension = ClassicWheelControllerExtension;
	exports.ComponentContext = ComponentContext;
	exports.ControlBarApi = ControlBarApi;
	exports.DefaultSequenceComponent = DefaultSequenceComponent;
	exports.DefaultSequenceComponentView = DefaultSequenceComponentView;
	exports.DefaultViewportController = DefaultViewportController;
	exports.DefaultViewportControllerExtension = DefaultViewportControllerExtension;
	exports.DefinitionWalker = DefinitionWalker;
	exports.Designer = Designer;
	exports.DesignerApi = DesignerApi;
	exports.DesignerContext = DesignerContext;
	exports.DesignerState = DesignerState;
	exports.Dom = Dom;
	exports.Editor = Editor;
	exports.EditorApi = EditorApi;
	exports.Icons = Icons;
	exports.InputView = InputView;
	exports.JoinView = JoinView;
	exports.LabelView = LabelView;
	exports.LineGridDesignerExtension = LineGridDesignerExtension;
	exports.ObjectCloner = ObjectCloner;
	exports.OutputView = OutputView;
	exports.PathBarApi = PathBarApi;
	exports.QuantifiedScaleViewportCalculator = QuantifiedScaleViewportCalculator;
	exports.RectPlaceholder = RectPlaceholder;
	exports.RectPlaceholderView = RectPlaceholderView;
	exports.RegionView = RegionView;
	exports.ServicesResolver = ServicesResolver;
	exports.SimpleEvent = SimpleEvent;
	exports.StepComponent = StepComponent;
	exports.StepExtensionResolver = StepExtensionResolver;
	exports.StepsDesignerExtension = StepsDesignerExtension;
	exports.StepsExtension = StepsExtension;
	exports.ToolboxApi = ToolboxApi;
	exports.Uid = Uid;
	exports.ValidationErrorBadgeExtension = ValidationErrorBadgeExtension;
	exports.Vector = Vector;
	exports.WorkspaceApi = WorkspaceApi;
	exports.createContainerStepComponentViewFactory = createContainerStepComponentViewFactory;
	exports.createSwitchStepComponentViewFactory = createSwitchStepComponentViewFactory;
	exports.createTaskStepComponentViewFactory = createTaskStepComponentViewFactory;
	exports.race = race;

}));
