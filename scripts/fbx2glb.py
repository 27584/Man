"""
此为blender中用于自动化合并混元AI生成的动作的脚本。
你需要确保所有原fbx文件放在同一目录，并含有各自一个动画。命名为modelName_animationName.fbx
"""
import bpy
import os
import glob

# --- 配置常量 ---
# 请根据你的实际情况修改以下两个常量
INPUT_FOLDER = "D:/Models"  # FBX文件所在的目录
FILE_PATTERN = "kobe_*.fbx" # 要匹配的FBX文件模式
# -----------------

def clear_scene():
    """清空当前场景的所有对象"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def get_armature_and_mesh(obj_list):
    """从对象列表中提取骨架和网格对象"""
    armature = None
    mesh = None
    for obj in obj_list:
        if obj.type == 'ARMATURE':
            armature = obj
        elif obj.type == 'MESH':
            mesh = obj
    return armature, mesh

def delete_object_and_data(obj):
    """安全删除对象及其关联数据（如网格、骨架数据），但不处理动作"""
    if obj.type == 'MESH':
        mesh_data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh_data and mesh_data.users == 0:
            bpy.data.meshes.remove(mesh_data)
    elif obj.type == 'ARMATURE':
        armature_data = obj.data
        # 注意：不在这里删除动作，因为动作可能被复制到目标骨架后仍被此骨架引用
        bpy.data.objects.remove(obj, do_unlink=True)
        if armature_data and armature_data.users == 0:
            bpy.data.armatures.remove(armature_data)
    else:
        bpy.data.objects.remove(obj, do_unlink=True)

def clean_unused_actions():
    """删除所有未被任何对象引用的动作"""
    removed_count = 0
    for act in bpy.data.actions:
        if act.users == 0:
            print(f"  删除未使用的动作: {act.name}")
            bpy.data.actions.remove(act)
            removed_count += 1
    if removed_count:
        print(f"  共清理 {removed_count} 个残留动作")

def import_fbx(filepath):
    """导入FBX文件，返回导入的所有对象列表"""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=filepath, use_anim=True)
    after = set(bpy.data.objects)
    new_objs = list(after - before)
    return new_objs

def get_clean_action_name(filepath):
    """从文件路径提取基础名，并去掉开头的 'kobe_' 前缀"""
    base = os.path.basename(filepath).replace(".fbx", "")
    if base.startswith("kobe_"):
        return base[5:]  # 删除 "kobe_"
    return base

def copy_action_from_armature(source_armature, action_name):
    """从骨架获取当前动作，并复制一份重命名后返回；原动作保持不变"""
    if source_armature.animation_data and source_armature.animation_data.action:
        src_action = source_armature.animation_data.action
        new_action = src_action.copy()
        new_action.name = action_name
        return new_action
    return None

def main():
    # 使用配置常量来构建文件路径
    pattern = os.path.join(INPUT_FOLDER, FILE_PATTERN)
    fbx_files = glob.glob(pattern)

    if not fbx_files:
        print(f"在目录 '{INPUT_FOLDER}' 中未找到任何匹配 '{FILE_PATTERN}' 的文件")
        return

    clear_scene()

    # ---- 处理第一个 FBX（基础模型） ----
    first_file = fbx_files[0]
    print(f"导入基础文件: {first_file}")
    first_objs = import_fbx(first_file)
    target_armature, target_mesh = get_armature_and_mesh(first_objs)
    if not target_armature:
        print("第一个文件未包含骨架，无法合并动画。")
        return

    # 重命名第一个骨架的原始动作（如果有）
    if target_armature.animation_data and target_armature.animation_data.action:
        original_action = target_armature.animation_data.action
        clean_name = get_clean_action_name(first_file)
        original_action.name = clean_name
        print(f"基础动作重命名为: {clean_name}")

    # 清理第一个 FBX 导入后可能产生的未使用动作
    clean_unused_actions()

    max_end_frame = 0

    # ---- 处理剩余的 FBX（仅动画） ----
    for fbx_path in fbx_files[1:]:
        print(f"处理: {fbx_path}")
        temp_objs = import_fbx(fbx_path)
        temp_armature, temp_mesh = get_armature_and_mesh(temp_objs)

        if not temp_armature:
            print(f"跳过 {fbx_path}，无骨架")
            for obj in temp_objs:
                delete_object_and_data(obj)
            clean_unused_actions()  # 清理临时导入产生的残留动作
            continue

        # 获取干净的动作名称
        action_name = get_clean_action_name(fbx_path)
        new_action = copy_action_from_armature(temp_armature, action_name)

        if new_action:
            if not target_armature.animation_data:
                target_armature.animation_data_create()
            # 创建 NLA 轨道并添加动作
            track = target_armature.animation_data.nla_tracks.new()
            track.name = action_name
            start_frame = int(round(new_action.frame_range[0]))
            strip = track.strips.new(action_name, start_frame, new_action)
            action_end = start_frame + int(round(new_action.frame_range[1] - new_action.frame_range[0]))
            if action_end > max_end_frame:
                max_end_frame = action_end
            print(f"  已添加动作: {action_name} (帧范围 {start_frame}-{action_end})")
        else:
            print(f"  警告: {fbx_path} 未找到动作")

        # 删除临时导入的所有对象（骨架、网格等）
        for obj in temp_objs:
            delete_object_and_data(obj)

        # 关键：清理此时不再被任何对象引用的动作（包括临时骨架上的原始动作）
        clean_unused_actions()

    # 调整场景结束帧
    if max_end_frame > 0:
        bpy.context.scene.frame_end = max_end_frame
        print(f"场景结束帧已设置为 {max_end_frame}")

    # 最终再清理一次，确保没有残留
    clean_unused_actions()
    print("合并完成。")

if __name__ == "__main__":
    main() 