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
"""Utility functions for file processing and message conversion."""

import json
import os
import shutil
import time
from typing import List, Dict, Any

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, ToolCall

from logger import logger
from vector_store import VectorStore


async def process_and_ingest_files_background(
    file_info: List[dict], 
    vector_store: VectorStore, 
    config_manager, 
    task_id: str, 
    indexing_tasks: Dict[str, str]
) -> None:
    """Process and ingest files in the background.
    
    Args:
        file_info: List of file dictionaries with 'filename' and 'content' keys
        vector_store: VectorStore instance for document indexing
        config_manager: ConfigManager instance for updating sources
        task_id: Unique identifier for this processing task
        indexing_tasks: Dictionary to track task status
    """
    try:
        logger.debug({
            "message": "Starting background file processing",
            "task_id": task_id,
            "file_count": len(file_info)
        })
        
        indexing_tasks[task_id] = "saving_files"
        
        permanent_dir = os.path.join("uploads", task_id)
        os.makedirs(permanent_dir, exist_ok=True)
        
        file_paths = []
        file_names = []
        
        for info in file_info:
            try:
                file_name = info["filename"]
                content = info["content"]
                
                safe_file_name = os.path.basename(file_name)
                file_path = os.path.join(permanent_dir, safe_file_name)
                with open(file_path, "wb") as f:
                    f.write(content)
                
                file_paths.append(file_path)
                file_names.append(safe_file_name)
                
                logger.debug({
                    "message": "Saved file",
                    "task_id": task_id,
                    "filename": file_name,
                    "path": file_path
                })
            except Exception as e:
                logger.error({
                    "message": f"Error saving file {info['filename']}",
                    "task_id": task_id,
                    "filename": info['filename'],
                    "error": str(e)
                }, exc_info=True)
        
        indexing_tasks[task_id] = "loading_documents"
        logger.debug({"message": "Loading documents", "task_id": task_id})
        
        try:
            documents = vector_store._load_documents(file_paths)
            
            logger.debug({
                "message": "Documents loaded, starting indexing",
                "task_id": task_id,
                "document_count": len(documents)
            })
            
            indexing_tasks[task_id] = "indexing_documents"

            for doc in documents:
                if not doc.metadata:
                    doc.metadata = {}
                doc.metadata["task_id"] = task_id

            vector_store.index_documents(documents)
            
            if file_names:
                config = config_manager.read_config()
                
                config_updated = False
                for file_name in file_names:
                    if file_name not in config.sources:
                        config.sources.append(file_name)
                        config_updated = True
                
                if config_updated:
                    config_manager.write_config(config)
                    logger.debug({
                        "message": "Updated config with new sources",
                        "task_id": task_id,
                        "sources": config.sources
                    })
            
            indexing_tasks[task_id] = "completed"
            logger.debug({
                "message": "Background processing and indexing completed successfully",
                "task_id": task_id
            })
        except Exception as e:
            indexing_tasks[task_id] = f"failed_during_indexing: {str(e)}"
            logger.error({
                "message": "Error during document loading or indexing",
                "task_id": task_id,
                "error": str(e)
            }, exc_info=True)

            # Cleanup saved files and config entries when embedding fails
            try:
                shutil.rmtree(permanent_dir, ignore_errors=True)
            except Exception as cleanup_error:
                logger.warning({
                    "message": "Failed to cleanup uploads after indexing error",
                    "task_id": task_id,
                    "error": str(cleanup_error)
                }, exc_info=True)

            try:
                config = config_manager.read_config()
                current_sources = config.sources or []
                current_selected = config.selected_sources or []

                updated_sources = [name for name in current_sources if name not in file_names]
                updated_selected = [name for name in current_selected if name not in file_names]

                if updated_sources != current_sources or updated_selected != current_selected:
                    config_manager.write_config(
                        config.model_copy(
                            update={
                                "sources": updated_sources,
                                "selected_sources": updated_selected,
                            }
                        )
                    )
            except Exception as config_error:
                logger.warning({
                    "message": "Failed to rollback config after indexing error",
                    "task_id": task_id,
                    "error": str(config_error)
                }, exc_info=True)
            
    except Exception as e:
        indexing_tasks[task_id] = f"failed: {str(e)}"
        logger.error({
            "message": "Error in background processing",
            "task_id": task_id,
            "error": str(e)
        }, exc_info=True)


async def delete_ingested_files(task_id: str, config_manager, indexing_tasks: Dict[str, str], vector_store: VectorStore) -> Dict[str, Any]:
    """Delete uploaded files associated with a task and update config.
    
    Args:
        task_id: Task identifier whose uploads should be removed
        config_manager: ConfigManager instance used to manage sources
        indexing_tasks: Dictionary tracking ingestion task status
    
    Returns:
        Dictionary containing deletion details
    """
    uploads_dir = os.path.join("uploads", task_id)
    
    if not os.path.isdir(uploads_dir):
        logger.warning({
            "message": "Attempted to delete uploads for non-existent task",
            "task_id": task_id,
            "path": uploads_dir
        })
        raise FileNotFoundError(f"No uploads found for task_id {task_id}")
    
    deleted_files = []
    for root, _, files in os.walk(uploads_dir):
        for filename in files:
            deleted_files.append(filename)
    
    try:
        shutil.rmtree(uploads_dir)
        logger.debug({
            "message": "Removed uploads directory for task",
            "task_id": task_id,
            "deleted_files": deleted_files
        })
    except Exception as e:
        logger.error({
            "message": "Failed to remove uploads directory",
            "task_id": task_id,
            "path": uploads_dir,
            "error": str(e)
        }, exc_info=True)
        raise
    
    try:
        deleted_vector_count = vector_store.delete_documents_by_task(task_id)

        config = config_manager.read_config()
        updated_sources = [s for s in config.sources if s not in deleted_files]
        selected_sources = config.selected_sources or []
        updated_selected_sources = [s for s in selected_sources if s not in deleted_files]
        
        if updated_sources != config.sources or updated_selected_sources != selected_sources:
            config_manager.write_config(
                config.model_copy(update={
                    "sources": updated_sources,
                    "selected_sources": updated_selected_sources
                })
            )
            logger.debug({
                "message": "Updated config after deleting uploads",
                "task_id": task_id,
                "remaining_sources": updated_sources
            })
    except Exception as e:
        logger.error({
            "message": "Failed to update config after deleting uploads",
            "task_id": task_id,
            "error": str(e)
        }, exc_info=True)
        raise
    
    if task_id in indexing_tasks:
        indexing_tasks[task_id] = "deleted"
    else:
        indexing_tasks[task_id] = "deleted"
    
    return {
        "deleted_files": deleted_files,
        "task_id": task_id,
        "deleted_vector_count": deleted_vector_count
    }


def convert_langgraph_messages_to_openai(messages: List) -> List[Dict[str, Any]]:
    """Convert LangGraph message objects to OpenAI API format.
    
    Args:
        messages: List of LangGraph message objects
        
    Returns:
        List of dictionaries in OpenAI API format
    """
    openai_messages = []
    
    for msg in messages:
        if isinstance(msg, HumanMessage):
            openai_messages.append({
                "role": "user", 
                "content": msg.content
            })
        elif isinstance(msg, AIMessage):
            openai_msg = {
                "role": "assistant", 
                "content": msg.content or ""
            }
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                openai_msg["tool_calls"] = []
                for tc in msg.tool_calls:
                    openai_msg["tool_calls"].append({
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["args"])
                        }
                    })
            openai_messages.append(openai_msg)
        elif isinstance(msg, ToolMessage):
            openai_messages.append({
                "role": "tool",
                "content": msg.content,
                "tool_call_id": msg.tool_call_id
            })
    
    return openai_messages
