interface DummyAnalysisComponentProps {
  result: {
    success: boolean;
    url: string;
    message: string;
  };
}

export function DummyAnalysisComponent({
  result,
}: DummyAnalysisComponentProps) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Performance Analysis</h2>
        <p className="text-blue-100 mb-4">{result.message}</p>
        <p className="text-sm text-blue-200">URL: {result.url}</p>
      </div>
    </div>
  );
}
