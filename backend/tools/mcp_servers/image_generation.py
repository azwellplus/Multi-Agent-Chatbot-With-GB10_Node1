#
# SPDX-FileCopyrightText: Copyright (c) 1993-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

"""
MCP server providing image generation tools using ComfyUI.

This server exposes tools to generate images using ComfyUI's workflow system.
It supports multiple workflow types and provides real-time generation status updates.
"""
import copy
import json
import os
import time
import uuid
from typing import Dict, List, Optional
from urllib import request, error
from urllib.parse import urlencode

from mcp.server.fastmcp import FastMCP

# ComfyUI API configuration
# Internal URL for API calls (Docker network)
COMFYUI_API_URL = os.getenv("COMFYUI_API_URL", "http://comfyui:8188")
# External URL for browser access (public IP)
COMFYUI_PUBLIC_URL = os.getenv("COMFYUI_PUBLIC_URL", "http://192.168.108.31:8188")

print(f"[image_generation] ComfyUI API URL: {COMFYUI_API_URL}")
print(f"[image_generation] ComfyUI Public URL: {COMFYUI_PUBLIC_URL}")

mcp = FastMCP("comfyui-image-generation-server")

# Full SDXL workflow template from a.py
WORKFLOW_TEMPLATE = {
    "5": {
        "inputs": {"width": 1024, "height": 1024, "batch_size": 1},
        "class_type": "EmptyLatentImage"
    },
    "4": {
        "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
        "class_type": "CheckpointLoaderSimple"
    },
    "12": {
        "inputs": {"ckpt_name": "sd_xl_refiner_1.0.safetensors"},
        "class_type": "CheckpointLoaderSimple"
    },
    "7": {
        "inputs": {"text": "text, watermark", "clip": ["4", 1]},
        "class_type": "CLIPTextEncode"
    },
    "53": {
        "inputs": {
            "from_translate": "auto",
            "to_translate": "en",
            "manual_translate": False,
            "text": "a beautiful landscape",
            "clip": ["4", 1]
        },
        "class_type": "GoogleTranslateCLIPTextEncodeNode"
    },
    "54": {
        "inputs": {
            "from_translate": "auto",
            "to_translate": "english",
            "add_proxies": False,
            "proxies": "",
            "auth_data": "",
            "service": "GoogleTranslator",
            "text": "text, watermark",
            "clip": ["12", 1]
        },
        "class_type": "DeepTranslatorCLIPTextEncodeNode"
    },
    "16": {
        "inputs": {"text": "text, watermark", "clip": ["12", 1]},
        "class_type": "CLIPTextEncode"
    },
    "10": {
        "inputs": {
            "add_noise": "enable",
            "noise_seed": 996087216610600,
            "steps": 25,
            "cfg": 8.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "start_at_step": 0,
            "end_at_step": 20,
            "return_with_leftover_noise": "enable",
            "model": ["4", 0],
            "positive": ["53", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
        },
        "class_type": "KSamplerAdvanced"
    },
    "11": {
        "inputs": {
            "add_noise": "disable",
            "noise_seed": 0,
            "steps": 25,
            "cfg": 8.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "start_at_step": 20,
            "end_at_step": 10000,
            "return_with_leftover_noise": "disable",
            "model": ["12", 0],
            "positive": ["54", 0],
            "negative": ["16", 0],
            "latent_image": ["10", 0]
        },
        "class_type": "KSamplerAdvanced"
    },
    "17": {
        "inputs": {"samples": ["11", 0], "vae": ["12", 2]},
        "class_type": "VAEDecode"
    },
    "19": {
        "inputs": {"filename_prefix": "ComfyUI", "images": ["17", 0]},
        "class_type": "SaveImage"
    }
}


def get_workflow_with_params(prompt: str, negative_prompt: str = "", width: int = 1024, height: int = 1024, steps: int = 25, end_at_step: int = 20) -> Dict:
    """Generate a workflow for ComfyUI with custom parameters.

    This uses a two-stage SDXL workflow (base + refiner) with translation support.
    """
    workflow = copy.deepcopy(WORKFLOW_TEMPLATE)

    # Update image dimensions
    workflow["5"]["inputs"]["width"] = width
    workflow["5"]["inputs"]["height"] = height

    # Update positive prompt (with translation)
    workflow["53"]["inputs"]["text"] = prompt
    workflow["54"]["inputs"]["text"] = prompt

    # Update negative prompt
    workflow["7"]["inputs"]["text"] = negative_prompt
    workflow["16"]["inputs"]["text"] = negative_prompt

    # Update sampling steps
    workflow["10"]["inputs"]["steps"] = steps
    workflow["10"]["inputs"]["end_at_step"] = end_at_step
    workflow["10"]["inputs"]["noise_seed"] = int(time.time() * 1000) % (2**32)

    workflow["11"]["inputs"]["steps"] = steps
    workflow["11"]["inputs"]["start_at_step"] = end_at_step

    return workflow


def queue_prompt(workflow: Dict, api_key: Optional[str] = None) -> str:
    """Queue a workflow in ComfyUI and return the prompt ID."""
    try:
        payload = {
            "prompt": workflow,
            "extra_data": {},
            "client_id": str(uuid.uuid4()),
        }
        if api_key:
            payload["extra_data"]["api_key_comfy_org"] = api_key

        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{COMFYUI_API_URL}/prompt",
            data=data,
            headers={"Content-Type": "application/json"},
        )

        with request.urlopen(req, timeout=30) as resp:
            resp_json = json.loads(resp.read().decode("utf-8"))
            prompt_id = resp_json.get("prompt_id")
            print(f"[image_generation] Queued prompt with ID: {prompt_id}")
            return prompt_id
    except error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        print(f"[image_generation] HTTP Error queuing prompt: {error_msg}")
        raise RuntimeError(f"Failed to queue prompt in ComfyUI: {error_msg}")
    except Exception as e:
        print(f"[image_generation] Error queuing prompt: {e}")
        raise RuntimeError(f"Failed to queue prompt in ComfyUI: {e}")


def get_history(prompt_id: str) -> Optional[Dict]:
    """Get the execution history for a prompt ID."""
    try:
        history_url = f"{COMFYUI_API_URL}/history/{prompt_id}"
        with request.urlopen(history_url, timeout=10) as resp:
            history = json.loads(resp.read().decode("utf-8"))
            return history.get(prompt_id)
    except error.HTTPError as e:
        print(f"[image_generation] HTTP Error getting history: {e.code}")
        return None
    except Exception as e:
        print(f"[image_generation] Error getting history: {e}")
        return None


def get_image(filename: str, subfolder: str = "", folder_type: str = "output") -> Optional[bytes]:
    """Download a generated image from ComfyUI."""
    try:
        params = {
            "filename": filename,
            "type": folder_type
        }
        if subfolder:
            params["subfolder"] = subfolder

        query_string = urlencode(params)
        image_url = f"{COMFYUI_API_URL}/view?{query_string}"

        with request.urlopen(image_url, timeout=30) as resp:
            return resp.read()
    except error.HTTPError as e:
        print(f"[image_generation] HTTP Error downloading image: {e.code}")
        return None
    except Exception as e:
        print(f"[image_generation] Error downloading image: {e}")
        return None


def wait_for_completion(prompt_id: str, timeout: int = 300) -> Optional[Dict]:
    """Wait for a prompt to complete execution."""
    start_time = time.time()

    while time.time() - start_time < timeout:
        history = get_history(prompt_id)

        if history is not None:
            # Check if execution is complete
            if "outputs" in history:
                print(f"[image_generation] Prompt {prompt_id} completed successfully")
                return history

        time.sleep(2)

    print(f"[image_generation] Timeout waiting for prompt {prompt_id}")
    return None


@mcp.tool()
def generate_image(
    prompt: str,
    negative_prompt: str = "text, watermark",
    width: int = 1024,
    height: int = 1024,
    steps: int = 25,
    end_at_step: int = 20
) -> str:
    """
    Generate an image using ComfyUI based on a text prompt.

    Uses a two-stage SDXL workflow (base + refiner) with automatic translation support.
    The workflow will translate prompts to English automatically if needed.

    Args:
        prompt: The text description of the image to generate (required, supports Korean)
        negative_prompt: Things to avoid in the generated image (default: "text, watermark")
        width: Width of the generated image in pixels (default: 1024, recommended SDXL sizes)
        height: Height of the generated image in pixels (default: 1024, recommended SDXL sizes)
        steps: Total number of sampling steps (default: 25, range: 1-100)
        end_at_step: Step at which to switch from base to refiner (default: 20)

    Returns:
        A message with the status and base64-encoded image data if successful.

    Recommended SDXL resolutions:
        - 1024x1024, 1152x896, 896x1152
        - 1216x832, 832x1216
        - 1344x768, 768x1344
        - 1536x640, 640x1536

    Example:
        generate_image(
            prompt="벚꽃이 흐드러지게 핀 봄날의 공원, 세밀한 묘사, 4k",
            negative_prompt="text, watermark, blurry",
            width=1024,
            height=1024,
            steps=25,
            end_at_step=20
        )
    """
    try:
        print(f"[image_generation] Generating image with prompt: {prompt[:100]}...")

        # Validate inputs - use SDXL recommended sizes
        width = max(512, min(2048, width))
        height = max(512, min(2048, height))
        steps = max(1, min(100, steps))
        end_at_step = max(1, min(steps, end_at_step))

        # Generate workflow with new SDXL template
        workflow = get_workflow_with_params(prompt, negative_prompt, width, height, steps, end_at_step)

        # Queue the prompt
        prompt_id = queue_prompt(workflow)

        # Wait for completion
        history = wait_for_completion(prompt_id, timeout=300)

        if history is None:
            return f"오류: 이미지 생성 시간이 초과되었습니다 (Prompt ID: {prompt_id})"

        # Extract image information
        outputs = history.get("outputs", {})

        # Find the SaveImage node output (node 19 in our workflow)
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                images = node_output["images"]
                if images:
                    image_info = images[0]
                    original_filename = image_info["filename"]
                    subfolder = image_info.get("subfolder", "")
                    folder_type = image_info.get("type", "output")

                    # Extract the numeric part and extension from the original filename
                    # e.g., "ComfyUI_00123_.png" or "CompyUI_00123_.png" -> extract "00123_.png"
                    import re
                    # Match pattern like: (Comf?yUI_)?(\d+_.+)
                    match = re.search(r'(?:Comp?[fy]UI_)?(\d+_.+)', original_filename)
                    if match:
                        numeric_part = match.group(1)
                        # Hardcode to ComfyUI_ prefix
                        filename = f"ComfyUI_{numeric_part}"
                        print(f"[image_generation] Original filename: {original_filename}")
                        print(f"[image_generation] Corrected filename: {filename}")
                    else:
                        # Fallback to original if pattern doesn't match
                        filename = original_filename
                        print(f"[image_generation] Using original filename: {filename}")

                    # Build the public image URL (for browser access)
                    params = {
                        "filename": filename,
                        "type": folder_type
                    }
                    if subfolder:
                        params["subfolder"] = subfolder

                    query_string = urlencode(params)
                    image_url = f"{COMFYUI_PUBLIC_URL}/view?{query_string}"

                    return f"""✅ 이미지 생성이 완료되었습니다!

📝 프롬프트: {prompt}
🚫 네거티브: {negative_prompt}
📐 크기: {width}x{height}
⚙️ 스텝: {steps} (Base: 0-{end_at_step}, Refiner: {end_at_step}-{steps})
📁 파일명: {filename}

🎨 워크플로우: SDXL Base + Refiner (2단계)
🌐 번역: 자동 (한글/기타 → 영어)

🖼️ [**생성된 이미지 보기**]({image_url})"""

        return "오류: 이미지가 생성되지 않았습니다. ComfyUI 서버 로그를 확인해주세요."

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[image_generation] Error generating image: {e}")
        print(f"[image_generation] Error details: {error_details}")
        return f"이미지 생성 오류: {str(e)}"


@mcp.tool()
def check_comfyui_status() -> str:
    """
    Check if ComfyUI server is available and responsive.

    Returns:
        Status message indicating if ComfyUI is ready to generate images.
    """
    try:
        stats_url = f"{COMFYUI_API_URL}/system_stats"
        with request.urlopen(stats_url, timeout=5) as resp:
            stats = json.loads(resp.read().decode("utf-8"))

        return f"""ComfyUI server is online and ready!

API URL: {COMFYUI_API_URL}
Public URL: {COMFYUI_PUBLIC_URL}
System Stats: {json.dumps(stats, indent=2)}

Workflow: SDXL Base + Refiner (Two-stage generation)
Translation: Automatic (Korean/Other → English)

You can now generate images using the generate_image tool."""

    except error.HTTPError as e:
        return f"""ComfyUI server returned an error.

HTTP Error Code: {e.code}
API URL: {COMFYUI_API_URL}

Please check if ComfyUI is running properly."""

    except Exception as e:
        return f"""ComfyUI server is not available.

Error: {str(e)}
API URL: {COMFYUI_API_URL}

Please ensure ComfyUI is running and accessible."""


@mcp.tool()
def list_available_models() -> str:
    """
    List all available checkpoint models in ComfyUI.

    Returns:
        A list of available model names that can be used for image generation.
    """
    try:
        # ComfyUI stores model info in /object_info endpoint
        object_info_url = f"{COMFYUI_API_URL}/object_info"
        with request.urlopen(object_info_url, timeout=10) as resp:
            object_info = json.loads(resp.read().decode("utf-8"))

        # Extract checkpoint models
        checkpoint_info = object_info.get("CheckpointLoaderSimple", {})
        checkpoint_inputs = checkpoint_info.get("input", {})
        required_inputs = checkpoint_inputs.get("required", {})
        models = required_inputs.get("ckpt_name", [[]])[0]

        if models:
            model_list = "\n".join([f"- {model}" for model in models])
            return f"""Available models in ComfyUI:

{model_list}

Current Workflow Uses:
- Base Model: sd_xl_base_1.0.safetensors
- Refiner Model: sd_xl_refiner_1.0.safetensors

Note: To use different models, you'll need to modify the workflow template."""
        else:
            return "No models found. Please add models to ComfyUI's models/checkpoints directory."

    except error.HTTPError as e:
        return f"HTTP Error listing models: {e.code}"
    except Exception as e:
        return f"Error listing models: {str(e)}"


if __name__ == "__main__":
    print(f"Running {mcp.name} MCP server")
    mcp.run(transport="stdio")
