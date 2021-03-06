//@flow
import React from "react";
import {Visitor, TextureLoader, TextureLoaders} from "gl-react";
import invariant from "invariant";
import type {Surface, Node} from "gl-react";
import type {Texture} from "gl-texture2d";
import renderer from "react-test-renderer";
import ndarray from "ndarray";
import defer from "promise-defer";

export const delay = (ms: number) => new Promise(success => setTimeout(success, ms));

class FakeTexture {
  width: number;
  height: number;
  getPixels: () => any;
  constructor(props) {
    invariant(props.getPixels, "FakeTexture: getPixels is required");
    Object.assign(this, props);
  }
}

function createNodeMock (o) {
  switch (o.type) {
  case "faketexture":
    return new FakeTexture(o.props);
  case "canvas":
    return {
      width: o.props.width,
      height: o.props.height,
    };
  default:
    return null;
  }
}

export const create = (el: React.Element<*>) =>
  renderer.create(el, { createNodeMock });

type SurfaceCounters = {
  onSurfaceDrawEnd: number,
  onSurfaceDrawStart: number,
  onSurfaceDrawSkipped: number,
};

type NodeCounters = {
  onNodeDrawSkipped: number,
  onNodeDrawStart: number,
  onNodeSyncDeps: number,
  onNodeDraw: number,
  onNodeDrawEnd: number,
};

export class CountersVisitor extends Visitor {
  _counters = {
    onSurfaceDrawSkipped: 0,
    onSurfaceDrawStart: 0,
    onSurfaceDrawEnd: 0,
    onNodeDrawSkipped: 0,
    onNodeDrawStart: 0,
    onNodeSyncDeps: 0,
    onNodeDraw: 0,
    onNodeDrawEnd: 0,
  };
  _surfaceCounters: WeakMap<Surface, SurfaceCounters> = new WeakMap();
  _nodeCounters: WeakMap<Node, NodeCounters> = new WeakMap();
  getCounters() {
    return this._counters;
  }
  getSurfaceCounters(surface: Surface): SurfaceCounters {
    let counters = this._surfaceCounters.get(surface);
    if (!counters) {
      counters = {
        onSurfaceDrawSkipped: 0,
        onSurfaceDrawStart: 0,
        onSurfaceDrawEnd: 0,
      };
      this._surfaceCounters.set(surface, counters);
    }
    return counters;
  }
  getNodeCounters(node: Node): NodeCounters {
    let counters = this._nodeCounters.get(node);
    if (!counters) {
      counters = {
        onNodeDrawSkipped: 0,
        onNodeDrawStart: 0,
        onNodeSyncDeps: 0,
        onNodeDraw: 0,
        onNodeDrawEnd: 0,
      };
      this._nodeCounters.set(node, counters);
    }
    return counters;
  }
  onSurfaceDrawSkipped(surface: Surface) {
    this._counters.onSurfaceDrawSkipped++;
    this.getSurfaceCounters(surface).onSurfaceDrawSkipped++;
  }
  onSurfaceDrawStart(surface: Surface) {
    this._counters.onSurfaceDrawStart++;
    this.getSurfaceCounters(surface).onSurfaceDrawStart++;
  }
  onSurfaceDrawEnd(surface: Surface) {
    this._counters.onSurfaceDrawEnd++;
    this.getSurfaceCounters(surface).onSurfaceDrawEnd++;
  }
  onNodeDrawSkipped(node: Node) {
    this._counters.onNodeDrawSkipped++;
    this.getNodeCounters(node).onNodeDrawSkipped++;
  }
  onNodeDrawStart(node: Node) {
    this._counters.onNodeDrawStart++;
    this.getNodeCounters(node).onNodeDrawStart++;
  }
  onNodeSyncDeps(node: Node) {
    this._counters.onNodeSyncDeps++;
    this.getNodeCounters(node).onNodeSyncDeps++;
  }
  onNodeDraw(node: Node) {
    this._counters.onNodeDraw++;
    this.getNodeCounters(node).onNodeDraw++;
  }
  onNodeDrawEnd(node: Node) {
    this._counters.onNodeDrawEnd++;
    this.getNodeCounters(node).onNodeDrawEnd++;
  }
}

export const red2x2 = ndarray(new Uint8Array([
  255, 0, 0, 255,
  255, 0, 0, 255,
  255, 0, 0, 255,
  255, 0, 0, 255,
]), [ 2, 2, 4 ]);


export const white3x3 = ndarray(new Uint8Array([
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
  255, 255, 255, 255,
]), [ 3, 3, 4 ]);

export const yellow3x3 = ndarray(new Uint8Array([
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
  255, 255, 0, 255,
]), [ 3, 3, 4 ]);

export function createOneTextureLoader (makeTexture: (gl: any)=>WebGLTexture) {
  const textureId = Symbol("one-texture");
  const counters = {
    constructor: 0,
    dispose: 0,
    textureDispose: 0,
    canLoad: 0,
    get: 0,
    load: 0,
    createTexture: 0,
  };
  const d = defer();
  function resolve() {
    d.resolve();
    return delay(50); // FIXME this is a hack.
  }
  function reject(e: Error) {
    d.reject(e);
    return delay(50); // FIXME this is a hack.
  }
  class Loader extends TextureLoader<typeof textureId> {
    texture: ?Texture = null;
    constructor (gl: WebGLRenderingContext) {
      super(gl);
      ++counters.constructor;
    }
    dispose() {
      ++counters.dispose;
    }
    canLoad(input: any) {
      ++counters.canLoad;
      return input === textureId;
    }
    get() {
      ++counters.get;
      return this.texture;
    }
    load() {
      ++counters.load;
      const promise = d.promise.then(() => {
        ++counters.createTexture;
        this.texture = makeTexture(this.gl);
        return this.texture;
      });
      function dispose() {
        ++counters.textureDispose;
      }
      return {
        promise,
        dispose,
      };
    }
  }
  return {
    Loader,
    textureId,
    counters,
    resolve,
    reject,
  };
}

import drawNDArrayTexture from "gl-react/lib/helpers/drawNDArrayTexture";
export function createNDArrayTexture (gl: WebGLRenderingContext, ndarray: *) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  drawNDArrayTexture(gl, texture, ndarray);
  return texture;
}
class FakeTextureLoader extends TextureLoader<FakeTexture> {
  textures: Array<WebGLTexture>;
  constructor(gl: WebGLRenderingContext) {
    super(gl);
    this.textures = [];
  }
  dispose() {
    const {gl} = this;
    this.textures.forEach(t => gl.deleteTexture(t));
  }
  canLoad (input: any) {
    return input instanceof FakeTexture;
  }
  get (ft: FakeTexture) {
    const array = ft.getPixels();
    if (array) {
      const t = createNDArrayTexture(this.gl, array);
      this.textures.push(t);
      return t;
    }
  }
}

TextureLoaders.add(FakeTextureLoader);
