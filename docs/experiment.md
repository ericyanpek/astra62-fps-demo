# 实验记录

第一版用 Astra 6.2 从零制作一个微型浏览器 FPS。创作提示词来自 [wquguru 的 FPS 实验，第 04 项](https://github.com/wquguru/fable52-fps-repro/tree/a7e1df3ce32eb2bb05e23ae457fe5fe2bffab961)，提示词的 [MIT 许可](LICENSE.prompts) 随附。

> Build me a FPS. Insanely detailed quality pls, something that looks visually like it can keep up with AAA. Make it small in scope (like a tiny level) but otherwise impressive photorealistic graphics

要求浏览器可玩、单文件 HTML，不加载外部模型、纹理或音频。场景、敌人、材质和声音由代码生成。Three.js 内嵌在游戏中，许可证见 [src/LICENSE.three](../src/LICENSE.three)。设计、实现和浏览器自检由同一模型完成；人给一次创作需求，模型可反复试玩、修改。这个过程没有统一的时间或 token 预算。
