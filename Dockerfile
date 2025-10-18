# ============================
# 🏗️ STAGE 1: Build
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore "TranzactiiBancare.sln"
RUN dotnet publish "TranzactiiBancare/TranzactiiBancare.csproj" -c Release -o /app/publish

# ============================
# 🚀 STAGE 2: Runtime
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "TranzactiiBancare.dll"]
