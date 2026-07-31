import { Picker } from '@react-native-picker/picker';
import { View, Text } from 'react-native';

interface PlanDropdownProps {
  plans: string[];
  selectedPlan: string;
  onChange: (value: string) => void;
}

export function PlanDropdown({ plans, selectedPlan, onChange }: PlanDropdownProps) {
  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-semibold text-slate-600 mb-2">Choose Data Plan</Text>
      <View className="rounded-3xl border border-slate-200 bg-slate-50">
        <Picker selectedValue={selectedPlan} onValueChange={onChange} mode="dropdown" itemStyle={{ fontSize: 16 }}>
          {plans.map((plan) => (
            <Picker.Item key={plan} label={plan} value={plan} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
