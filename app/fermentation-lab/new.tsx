import { Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FermentationProjectForm } from '@/components/FermentationProjectForm';
import { fermentationTemplates } from '@/features/fermentation/catalog';
import { useFermentationRepository } from '@/hooks/useFermentationRepository';
import { colors } from '@/constants/theme';
import type { FermentationProjectInput } from '@/types/fermentation';

export default function NewFermentationProjectScreen() {
  const repository = useFermentationRepository();

  const saveProject = async (input: FermentationProjectInput) => {
    const project = await repository.createProject(input);
    const template = fermentationTemplates.find((item) => item.id === project.fermentationType);
    try {
      if (template) {
        for (const field of template.suggestedFields) {
          await repository.createCustomField({
            projectId: project.id,
            batchId: null,
            name: field.name,
            fieldType: field.type,
            unit: field.unit ?? '',
          });
        }
      }
    } catch {
      Alert.alert('Proyecto creado', 'El proyecto está guardado. Podrás añadir los campos de seguimiento desde su ficha.');
    }
    router.replace({ pathname: '/fermentation-lab/[id]', params: { id: project.id } } as never);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <FermentationProjectForm onCancel={() => router.back()} onSave={saveProject} />
    </SafeAreaView>
  );
}
