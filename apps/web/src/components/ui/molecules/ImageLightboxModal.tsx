import React from 'react';
import { MediaLightboxModal } from './MediaLightboxModal';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * ImageLightboxModal delegates to MediaLightboxModal with type="image".
 * Reuses the centralised zoom, rotation, keyboard shortcuts, and portal logic.
 */
export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  src,
  alt = 'Image preview',
  onClose,
}) => {
  return (
    <MediaLightboxModal
      isOpen={isOpen}
      src={src}
      type="image"
      alt={alt}
      onClose={onClose}
    />
  );
};
