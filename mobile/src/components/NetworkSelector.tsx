import { TouchableOpacity, View, Text, Image } from 'react-native';

const networks = [
  { id: 'MTN', label: 'MTN', color: 'bg-yellow-100', logo: 'https://dummyimage.com/64x64/ffe600/000&text=MTN' },
  { id: 'Airtel', label: 'Airtel', color: 'bg-red-100', logo: 'https://dummyimage.com/64x64/fa163f/fff&text=A' },
  { id: 'Glo', label: 'Glo', color: 'bg-green-100', logo: 'https://dummyimage.com/64x64/00c26b/fff&text=G' },
  { id: '9Mobile', label: '9Mobile', color: 'bg-slate-100', logo: 'https://dummyimage.com/64x64/0f172a/fff&text=9M' },
];

interface NetworkSelectorProps {
  selected: string;
  onSelect: (value: 'MTN' | 'Airtel' | 'Glo' | '9Mobile') => void;
}

export function NetworkSelector({ selected, onSelect }: NetworkSelectorProps) {
  return (
    <View className="grid grid-cols-2 gap-3">
      {networks.map((network) => (
        <TouchableOpacity
          key={network.id}
          onPress={() => onSelect(network.id as any)}
          className={`rounded-3xl border p-4 ${selected === network.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
        >
          <View className="flex-row items-center gap-3">
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${network.color}`}>
              <Text className="font-bold text-lg">{network.id[0]}</Text>
            </View>
            <View>
              <Text className="font-semibold">{network.label}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
