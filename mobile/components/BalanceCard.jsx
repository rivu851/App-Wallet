import { View, Text } from "react-native";
import { styles } from "../assets/styles/home.styles";
import { COLORS } from "../constants/colors";

export const BalanceCard = ({ summary, source }) => {
  const own = source === "own";
  const amount = (value) => Number(value || 0).toFixed(2);

  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceTitle}>{own ? "My money" : "Dad's money"}</Text>
      <Text style={styles.balanceAmount}>
        Rs{amount(own ? summary.own_balance : summary.father_spending)}
      </Text>
      <Text style={styles.balanceStatLabel}>{own ? "Available balance" : "Total recorded spending"}</Text>
      {own && <View style={styles.balanceStats}>
        <View style={styles.balanceStatItem}>
          <Text style={styles.balanceStatLabel}>Income</Text>
          <Text style={[styles.balanceStatAmount, { color: COLORS.income }]}>+Rs{amount(summary.own_income)}</Text>
        </View>
        <View style={styles.balanceStatItem}>
          <Text style={styles.balanceStatLabel}>All-time spending</Text>
          <Text style={[styles.balanceStatAmount, { color: COLORS.expense }]}>Rs{amount(summary.own_expenses)}</Text>
        </View>
      </View>}
      <View style={styles.periodStats}>
        {[
          { label: "Today", value: own ? summary.own_daily_spending : summary.father_daily_spending },
          { label: "Last 7 days", value: own ? summary.own_weekly_spending : summary.father_weekly_spending },
          { label: "This month", value: own ? summary.own_monthly_spending : summary.father_monthly_spending },
        ].map((period) => (
          <View key={period.label} style={styles.periodStatItem}>
            <Text style={styles.balanceStatLabel}>{period.label}</Text>
            <Text style={[styles.periodStatAmount, { color: COLORS.expense }]}>Rs{amount(period.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
