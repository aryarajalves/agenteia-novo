import { useState, useRef } from 'react';
import { api } from '../../../api/client';

export const useChatMedia = ({ showToast }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImage = async (imageFile) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const uploadRes = await api.upload('/upload-image', formData);
            if (!uploadRes.ok) throw new Error("Falha no upload");
            const uploadData = await uploadRes.json();
            return uploadData.image_url;
        } catch (err) {
            if (showToast) {
                showToast(`Falha no upload: ${err.message}`, "error");
            }
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        selectedImage,
        setSelectedImage,
        imagePreview,
        setImagePreview,
        isUploading,
        setIsUploading,
        fileInputRef,
        handleImageSelect,
        handleRemoveImage,
        uploadImage
    };
};
