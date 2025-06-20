import { LiveExam } from "@/types/tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export interface ExamAccordionCardProps {
  exam: LiveExam;
  onTakeExam: () => void;
  onViewResults: () => void;
}

export function ExamAccordionCard({ exam, onTakeExam, onViewResults }: ExamAccordionCardProps) {
  const now = new Date();
  const endDate = new Date(exam.scheduledEndTime);
  const isExpired = endDate < now;

  return (
    <Card className={`${isExpired ? 'bg-red-50' : ''}`}>
      <CardHeader>
        <CardTitle className={`${isExpired ? 'text-red-700' : ''}`}>{exam.title}</CardTitle>
        <CardDescription>
          {isExpired ? (
            <span className="text-red-600">Sınav süresi dolmuştur</span>
          ) : (
            <>
              Başlangıç: {formatDistanceToNow(new Date(exam.scheduledStartTime), { addSuffix: true, locale: tr })}
              <br />
              Bitiş: {formatDistanceToNow(new Date(exam.scheduledEndTime), { addSuffix: true, locale: tr })}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p>Süre: {exam.timeLimit} dakika</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isExpired ? (
          <Button variant="outline" onClick={onViewResults}>
            Sonuçlar
          </Button>
        ) : (
          <Button variant="default" onClick={onTakeExam}>
            Sınava Gir
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 