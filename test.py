import pandas as pd

df = pd.read_csv("goal types.csv")
df["Goal"] = df["Goal"].str.lower()

df.to_csv("goal types.csv", index=False)