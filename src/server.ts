import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`⚡️[server]: Nigerian Data & Airtime VTU Backend running at http://localhost:${PORT}`);
});
