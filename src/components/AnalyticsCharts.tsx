import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AnalyticsChartsProps {
  resumeCount: number;
  avgScore: number;
  skillsGap: { skill: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsCharts = ({ resumeCount, avgScore, skillsGap, scoreDistribution }: AnalyticsChartsProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scoreDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Skills Gap</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={skillsGap}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ skill, percent }) => `${skill} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {skillsGap.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};