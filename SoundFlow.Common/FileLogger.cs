using System;
using System.IO;

namespace SoundFlow.Common;

public static class FileLogger
{
    private static readonly string LogDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");

    public static void Log(string programName, string message)
    {
        try
        {
            Directory.CreateDirectory(LogDir);
            string logPath = Path.Combine(LogDir, $"{programName}.log");
            string logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
            File.AppendAllText(logPath, logLine);
            System.Diagnostics.Debug.WriteLine(logLine);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to write log: {ex.Message}");
        }
    }
}