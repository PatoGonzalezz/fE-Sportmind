from pathlib import Path
from typing import Optional, Union, Dict, Any
import warnings
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

# Ignorar advertencias de versiones menores al des-serializar scikit-learn
warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(
    title="SportMind ML API",
    description="API para la predicción de autorregulación emocional en atletas",
    version="1.0.0"
)

# Permitir peticiones desde tu frontend (Astro en localhost:4321 / Electron)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4321", "http://localhost:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar el modelo .pkl desde la misma carpeta del archivo api.py
MODEL_PATH = Path(__file__).resolve().parent / "modelo_autoregulacion_emocional.pkl"

try:
    data_bundle = joblib.load(MODEL_PATH)
    if isinstance(data_bundle, dict):
        modelo = data_bundle.get("modelo")
        scaler = data_bundle.get("scaler")
        encoders = data_bundle.get("encoders", {})
        feature_names = data_bundle.get("features", [])
        metadata = data_bundle.get("metadata", {})
    else:
        modelo = data_bundle
        scaler = None
        encoders = {}
        feature_names = []
        metadata = {}
    print(f"[OK] Modelo cargado exitosamente desde: {MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Error cargando modelo {MODEL_PATH}: {e}")
    modelo = None
    scaler = None
    encoders = {}
    feature_names = []
    metadata = {}


def safe_encode(encoder, value: Any, default_idx: int = 0) -> int:
    """Codifica de forma segura un valor categórico usando el LabelEncoder provisto."""
    if encoder is None or value is None:
        return default_idx
    val_str = str(value).strip().lower()
    for idx, class_name in enumerate(getattr(encoder, "classes_", [])):
        if str(class_name).strip().lower() == val_str:
            return int(idx)
    return default_idx


def safe_float(value: Any, default: float = 0.0) -> float:
    """Convierte de forma segura cualquier valor numérico o texto a float."""
    try:
        if value is None:
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


class DatosAtleta(BaseModel):
    # Variables demográficas y deportivas
    selectedSport: Optional[str] = Field("Escalada", description="Deporte del atleta")
    gender: Optional[str] = Field("Masculino", description="Género")
    emotionalState: Optional[str] = Field("Calma", description="Estado emocional inicial")
    
    # Emociones previas a las pruebas
    preEmotionTiroEasy: Optional[Union[float, int, str]] = 0
    preEmotionTiroHard: Optional[Union[float, int, str]] = 0
    preEmotionMuroEasy: Optional[Union[float, int, str]] = 0
    preEmotionMuroHard: Optional[Union[float, int, str]] = 0
    
    # Pruebas de tiro
    shootingScoreEasy: Optional[float] = 0.0
    shootingScoreHard: Optional[float] = 0.0
    shootingRendimiento: Optional[float] = 0.0
    shootingRitmo: Optional[float] = 0.0
    shootingConfianza: Optional[float] = 0.0
    shootingPostEmotion: Optional[str] = Field("Neutral", description="Emoción post tiro")
    
    # Pruebas de escalada
    climbingTimeEasy: Optional[float] = 0.0
    climbingTimeHard: Optional[float] = 0.0
    climbingRendimiento: Optional[float] = 0.0
    climbingRitmo: Optional[float] = 0.0
    climbingConfianza: Optional[float] = 0.0
    climbingPostEmotion: Optional[str] = Field("Neutral", description="Emoción post escalada")
    
    # Recomendación final
    recomendacionFinal: Optional[float] = 0.0


@app.get("/")
def home():
    return {
        "status": "online",
        "service": "SportMind Prediction API",
        "model_loaded": modelo is not None,
        "metadata": metadata,
        "features": feature_names
    }


@app.post("/predict")
@app.post("/predict/")
def predecir(datos: DatosAtleta):
    if modelo is None:
        raise HTTPException(status_code=500, detail="El modelo no está disponible.")

    # Codificar variables categóricas según los encoders del bundle
    le_sport = encoders.get("le_sport")
    le_gender = encoders.get("le_gender")
    le_state = encoders.get("le_emotionalState")
    le_post = encoders.get("le_post")

    sport_enc = safe_encode(le_sport, datos.selectedSport, default_idx=0)
    gender_enc = safe_encode(le_gender, datos.gender, default_idx=0)
    state_enc = safe_encode(le_state, datos.emotionalState, default_idx=0)
    shoot_post_enc = safe_encode(le_post, datos.shootingPostEmotion, default_idx=0)
    climb_post_enc = safe_encode(le_post, datos.climbingPostEmotion, default_idx=0)

    # Construir el vector de 20 características en el orden exacto de entrenamiento
    features_vector = np.array([[
        sport_enc,
        gender_enc,
        state_enc,
        safe_float(datos.preEmotionTiroEasy),
        safe_float(datos.preEmotionTiroHard),
        safe_float(datos.preEmotionMuroEasy),
        safe_float(datos.preEmotionMuroHard),
        safe_float(datos.shootingScoreEasy),
        safe_float(datos.shootingScoreHard),
        safe_float(datos.shootingRendimiento),
        safe_float(datos.shootingRitmo),
        safe_float(datos.shootingConfianza),
        shoot_post_enc,
        safe_float(datos.climbingTimeEasy),
        safe_float(datos.climbingTimeHard),
        safe_float(datos.climbingRendimiento),
        safe_float(datos.climbingRitmo),
        safe_float(datos.climbingConfianza),
        climb_post_enc,
        safe_float(datos.recomendacionFinal),
    ]], dtype=np.float64)

    # Escalar si el modelo cuenta con scaler
    if scaler is not None:
        features_vector = scaler.transform(features_vector)

    prediccion = modelo.predict(features_vector)[0]
    
    probabilidad = None
    if hasattr(modelo, "predict_proba"):
        probs = modelo.predict_proba(features_vector)[0]
        probabilidad = [float(p) for p in probs]

    resultado = int(prediccion)
    etiqueta = "Autorregulación Óptima" if resultado == 1 else "Requiere Intervención / Desregulado"

    return {
        "prediccion": resultado,
        "etiqueta": etiqueta,
        "probabilidades": probabilidad,
        "features_utilizadas": feature_names
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)