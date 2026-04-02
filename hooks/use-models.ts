"use client";

import { useState, useEffect } from "react";
import { AVAILABLE_MODELS, IMAGE_MODELS, getDefaultModel } from "@/lib/models";
import type { ModelOption, ModelsConfig } from "@/lib/types";

export function useModels() {
  const [chatModels, setChatModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [imageModels, setImageModels] = useState<ModelOption[]>(IMAGE_MODELS);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(getDefaultModel(AVAILABLE_MODELS));
  const [selectedImageModel, setSelectedImageModel] = useState<ModelOption>(IMAGE_MODELS[0]);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data: ModelsConfig = await res.json();
          if (data.chatModels?.length) {
            setChatModels(data.chatModels);
            setSelectedModel((prev) =>
              data.chatModels.find((m) => m.id === prev.id) || getDefaultModel(data.chatModels)
            );
          }
          if (data.imageModels?.length) {
            setImageModels(data.imageModels);
            setSelectedImageModel((prev) =>
              data.imageModels.find((m) => m.id === prev.id) || data.imageModels[0]
            );
          }
        }
      } catch {
        // use defaults
      }
    }
    loadModels();
  }, []);

  return {
    chatModels,
    imageModels,
    selectedModel,
    setSelectedModel,
    selectedImageModel,
    setSelectedImageModel,
  };
}

