import { TouchableOpacity, View, Text } from 'react-native';

const categories = ['SME', 'Corporate Gifting', 'Direct Data'] as const;

interface CategoryTabsProps {
  selected: string;
  onSelect: (category: 'SME' | 'Corporate Gifting' | 'Direct Data') => void;
}

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <View className="flex-row gap-3">
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          onPress={() => onSelect(category)}
          className={`rounded-full px-4 py-3 ${selected === category ? 'bg-indigo-600' : 'bg-slate-100'}`}
        >
          <Text className={`text-sm font-semibold ${selected === category ? 'text-white' : 'text-slate-700'}`}>{category}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
