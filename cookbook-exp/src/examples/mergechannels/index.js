//@flow
import React, { Component } from "react";
import { Shaders, Node, GLSL } from "gl-react";
import { Surface } from "gl-react-exponent";

const shaders = Shaders.create({
  mergeChannels: {
    frag: GLSL`precision highp float;
varying vec2 uv;
uniform sampler2D channels[3];
float monochrome (vec3 c) {
  return 0.2125 * c.r + 0.7154 * c.g + 0.0721 * c.b;
}
void main() {
  gl_FragColor = vec4(
    monochrome(texture2D(channels[0], uv).rgb),
    monochrome(texture2D(channels[1], uv).rgb),
    monochrome(texture2D(channels[2], uv).rgb),
    1.0
  );
}` }
});

export class MergeChannels extends Component {
  render() {
    const { red, green, blue } = this.props;
    return <Node
      shader={shaders.mergeChannels}
      uniforms={{
        channels: [ red, green, blue ]
      }}
    />;
  }
}

export default class Example extends Component {
  render() {
    const { red, green, blue, width } = this.props;
    return (
      <Surface width={width} height={width}>
        <MergeChannels
          red={red}
          green={green}
          blue={blue}
        />
      </Surface>
    );
  }

  static defaultProps = {
    red: require("./img1.png"),
    green: require("./img2.png"),
    blue: require("./img3.png"),
  };
}
