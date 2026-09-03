import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import { Button } from '../atoms/Button';
import { OnboardingStepIndicator, ONBOARDING_STEPS } from './onboarding/OnboardingStepIndicator';
import { OnboardingWelcomeStep } from './onboarding/OnboardingWelcomeStep';
import { OnboardingRoleWorkflowStep } from './onboarding/OnboardingRoleWorkflowStep';
import { OnboardingWorkspaceStep } from './onboarding/OnboardingWorkspaceStep';
import { OnboardingQuickLaunchStep } from './onboarding/OnboardingQuickLaunchStep';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  completeOnboarding,
  setShowOnboardingModal,
  selectCurrentUser,
} from '../../../store/authSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { setOnboardingDismissed } from '../../../lib/storage/browserStorage';
import { User } from '../../../lib/api/authService';

export interface RoleOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userOverride?: User | null;
}

export const RoleOnboardingModal: React.FC<RoleOnboardingModalProps> = ({
  isOpen,
  onClose,
  userOverride,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reduxUser = useAppSelector(selectCurrentUser);
  const user = userOverride || reduxUser;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset step whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleDismiss = () => {
    setOnboardingDismissed(true);
    dispatch(setShowOnboardingModal(false));
    onClose();
  };

  const handleCompleteAndNavigate = async (destinationPath?: string) => {
    setIsSubmitting(true);
    try {
      await dispatch(completeOnboarding()).unwrap();
      setOnboardingDismissed(true);
      dispatch(enqueueSnackbar('Selamat! Anda telah menyelesaikan onboarding.', 'success'));
      dispatch(setShowOnboardingModal(false));
      onClose();

      if (destinationPath) {
        navigate(destinationPath);
      }
    } catch {
      // If network fails, still allow user to proceed
      setOnboardingDismissed(true);
      dispatch(setShowOnboardingModal(false));
      onClose();
      if (destinationPath) {
        navigate(destinationPath);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentStep === ONBOARDING_STEPS.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-[#1C1A19] rounded-[28px] border border-stone-200/80 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header Bar */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#B1E743] text-stone-900 font-extrabold text-sm shadow-xs">
              Q
            </div>
            <div>
              <h2 id="onboarding-modal-title" className="text-sm font-bold text-stone-900 dark:text-white">
                Onboarding Panduan Peran Tim
              </h2>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
                Langkah {currentStep} dari {ONBOARDING_STEPS.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors px-2 py-1"
            >
              Lewati
            </button>
            <IconButton
              onClick={handleDismiss}
              label="Tutup Onboarding"
              size="sm"
              variant="ghost"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-3.5 bg-stone-50/60 dark:bg-stone-900/40 border-b border-stone-100 dark:border-stone-800/60 shrink-0">
          <OnboardingStepIndicator
            currentStep={currentStep}
            onSelectStep={(step) => setCurrentStep(step)}
          />
        </div>

        {/* Dynamic Step Content (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin">
          {currentStep === 1 && <OnboardingWelcomeStep user={user} />}
          {currentStep === 2 && <OnboardingRoleWorkflowStep role={user.role} />}
          {currentStep === 3 && <OnboardingWorkspaceStep role={user.role} />}
          {currentStep === 4 && (
            <OnboardingQuickLaunchStep
              role={user.role}
              onLaunchDestination={(dest) => handleCompleteAndNavigate(dest)}
            />
          )}
        </div>

        {/* Bottom Navigation Controls Bar */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900/80 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Kembali
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
              >
                Lewati untuk Sekarang
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLastStep ? (
              <Button
                size="sm"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Lanjutkan
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleCompleteAndNavigate()}
                isLoading={isSubmitting}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Selesaikan Onboarding
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
