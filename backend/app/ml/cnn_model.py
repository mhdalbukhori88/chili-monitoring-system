"""
CNN multi-head untuk deteksi tanaman/daun/buah/kondisi dari satu foto.
Arsitektur: backbone CNN kecil (bisa diganti ResNet/MobileNet pretrained)
lalu 4 head klasifikasi terpisah.
"""
import torch
import torch.nn as nn
import torchvision.models as tv_models

LEAF_HEALTH_CLASSES = ["sehat", "kuning", "keriting", "bercak_daun"]
FRUIT_STAGE_CLASSES = ["tidak_ada", "bunga", "buah_hijau", "buah_matang"]
CONDITION_CLASSES = ["sehat", "stres_air", "defisiensi_nutrisi", "hama_penyakit"]


class ChiliMultiHeadCNN(nn.Module):
    def __init__(self, pretrained: bool = True):
        super().__init__()
        # Backbone ringan (MobileNetV3) - cocok untuk inference cepat / device terbatas
        backbone = tv_models.mobilenet_v3_small(
            weights=tv_models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        )
        self.features = backbone.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        feat_dim = backbone.classifier[0].in_features

        self.plant_head = nn.Linear(feat_dim, 2)                      # ada tanaman / tidak
        self.leaf_health_head = nn.Linear(feat_dim, len(LEAF_HEALTH_CLASSES))
        self.fruit_stage_head = nn.Linear(feat_dim, len(FRUIT_STAGE_CLASSES))
        self.condition_head = nn.Linear(feat_dim, len(CONDITION_CLASSES))

        # regresi sederhana untuk estimasi jumlah daun & buah (nilai kontinu)
        self.leaf_count_head = nn.Linear(feat_dim, 1)
        self.fruit_count_head = nn.Linear(feat_dim, 1)

    def forward(self, x: torch.Tensor) -> dict:
        feat = self.pool(self.features(x)).flatten(1)
        return {
            "plant_logits": self.plant_head(feat),
            "leaf_health_logits": self.leaf_health_head(feat),
            "fruit_stage_logits": self.fruit_stage_head(feat),
            "condition_logits": self.condition_head(feat),
            "leaf_count": torch.relu(self.leaf_count_head(feat)),
            "fruit_count": torch.relu(self.fruit_count_head(feat)),
        }


def build_model(pretrained: bool = True) -> ChiliMultiHeadCNN:
    return ChiliMultiHeadCNN(pretrained=pretrained)
