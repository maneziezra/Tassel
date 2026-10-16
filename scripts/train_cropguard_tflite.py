import os
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# ---------------------------------------------------------
# 1. SETUP & AUTHENTICATION (Replace with your Kaggle info)
# ---------------------------------------------------------
os.environ['KAGGLE_USERNAME'] = "YOUR_KAGGLE_USERNAME"
os.environ['KAGGLE_KEY'] = "YOUR_KAGGLE_API_KEY"

# Download the PlantVillage dataset
os.system("kaggle datasets download -d emmarex/plantdisease")
os.system("unzip -q plantdisease.zip -d dataset/")

# ---------------------------------------------------------
# 2. DATA PIPELINE
# ---------------------------------------------------------
# We only care about 4 crops for the defensible strategy: Tomato, Potato, Maize, Pepper
# You should pre-filter the dataset folders, or let the datagen run on the whole dataset.
# For this script, we'll assume it runs on the whole dataset for simplicity.

base_dir = 'dataset/PlantVillage'

datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True,
    validation_split=0.2
)

train_generator = datagen.flow_from_directory(
    base_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='training'
)

val_generator = datagen.flow_from_directory(
    base_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='validation'
)

# ---------------------------------------------------------
# 3. MODEL ARCHITECTURE (MobileNetV2)
# ---------------------------------------------------------
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # Freeze base model

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
predictions = Dense(train_generator.num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# ---------------------------------------------------------
# 4. TRAINING
# ---------------------------------------------------------
print("Starting training...")
model.fit(
    train_generator,
    epochs=5,
    validation_data=val_generator
)

# ---------------------------------------------------------
# 5. TFLITE EXPORT (Quantized for Mobile)
# ---------------------------------------------------------
print("Exporting model to TFLite...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT] # Quantize to save space
tflite_model = converter.convert()

with open('cropguard.tflite', 'wb') as f:
    f.write(tflite_model)

print("Export complete! Download cropguard.tflite and place it in your Expo app assets folder.")
