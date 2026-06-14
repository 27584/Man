****穷玩车,富玩表,顶富就玩牢大快跑（bushi****
Man! What can I say

本项目为UCAS计科导作业,基于three.js开发


**难绷的话**
最难绷的是，cs101网页提交压缩包的大小限制根本没有说明说的那么大，导致我提交了将近一周。
最后测试出，大概40M左右就无法提交了。
随后，我对使用的3D模型进行了压缩（https://tinyglb.cn/home），顺利解决了这个问题，同时还提升了加载速度。


**关于素材**
所有音频文件均来自B站。
牢大的洛克王国贴图来自B站。
天空盒贴图来自https://www.3d66.com/tietu_relations/3Em1DL.html。
模型、贴图与动作由混元AI生成，再由我进行合并。（附上用于动画合并的自动化脚本：scripts\fbx2glb.py）

**关于架构**
其实我本来在开发的中期想要改成SEC（Scene - Entity - Component）架构，但为时已晚，此时代码已经成了屎山，难以移植使用SEC架构。所以我只能在屎山的基础上尽量做拆分。
如你所见，src\scenes下的两个场景分别对应了主场景和跑酷场景，其中main-scene与run-game-scene的架构上稍有不同，最直接的区别在于，main-scene中的对象传递scene参数时对应的是Three.js原生的scene实例，而run-game-scene中的对象传递scene参数时对应的是RunGameScene的实例本身。

**排行榜功能**
使用了supabase（https://supabase.com/）